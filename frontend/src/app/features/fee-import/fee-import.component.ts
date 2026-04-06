import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

interface FeeImportRow {
  rowNumber: number;
  excelLastName: string;
  excelFirstName: string;
  matchedMemberId: number | null;
  matchedMemberName: string | null;
  confidence: number;
  yearPayments: { [year: number]: number };
  note: string | null;
  status: string;
  selected: boolean;
  editing: boolean;
  searchText: string;
  searchResults: any[];
}

interface FeeImportResult {
  rows: FeeImportRow[];
  totalRows: number;
  matchedCount: number;
  unmatchedCount: number;
  lowConfidenceCount: number;
  years: number[];
}

@Component({
  selector: 'app-fee-import',
  standalone: true,
  imports: [
    FormsModule, MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatCheckboxModule, MatProgressBarModule, MatFormFieldModule, MatInputModule,
    MatAutocompleteModule, MatTooltipModule, NgIf, NgFor, NgClass
  ],
  template: `
    <h2>Jahresbeiträge Excel-Import</h2>

    <!-- Upload -->
    <mat-card *ngIf="!preview">
      <mat-card-content>
        <div class="upload-area" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
          <mat-icon class="upload-icon">upload_file</mat-icon>
          <p>Excel-Datei (.xlsx) hierher ziehen oder</p>
          <button mat-raised-button color="primary" (click)="fileInput.click()">Datei auswählen</button>
          <input #fileInput type="file" accept=".xlsx,.xls" (change)="onFileSelected($event)" hidden>
          <p *ngIf="selectedFile" class="file-name"><strong>{{ selectedFile.name }}</strong></p>
        </div>
        <mat-progress-bar *ngIf="loading" mode="indeterminate" class="progress"></mat-progress-bar>
      </mat-card-content>
    </mat-card>

    <!-- Preview -->
    <div *ngIf="preview && !importDone">
      <div class="page-header">
        <h3>Vorschau: {{ preview.totalRows }} Zeilen
          ({{ preview.matchedCount }} zugeordnet,
          {{ preview.lowConfidenceCount }} unsicher,
          {{ preview.unmatchedCount }} nicht gefunden)
        </h3>
        <div class="action-buttons">
          <button mat-raised-button (click)="reset()">
            <mat-icon>arrow_back</mat-icon> Zurück
          </button>
          <button mat-raised-button color="accent" (click)="selectAllMatched()">
            Alle ≥85%
          </button>
          <button mat-raised-button color="primary" (click)="confirmImport()" [disabled]="importing || selectedCount === 0">
            <mat-icon>check</mat-icon> {{ selectedCount }} importieren
          </button>
        </div>
      </div>

      <mat-progress-bar *ngIf="importing" mode="indeterminate" class="progress"></mat-progress-bar>

      <mat-card>
        <mat-card-content>
          <div class="table-responsive">
            <table mat-table [dataSource]="preview.rows" class="full-width fee-import-table">
              <ng-container matColumnDef="select">
                <th mat-header-cell *matHeaderCellDef style="width:48px">
                  <mat-checkbox (change)="toggleAll($event.checked)" [checked]="allSelected"></mat-checkbox>
                </th>
                <td mat-cell *matCellDef="let row">
                  <mat-checkbox [(ngModel)]="row.selected" [disabled]="!row.matchedMemberId"></mat-checkbox>
                </td>
              </ng-container>

              <ng-container matColumnDef="nr">
                <th mat-header-cell *matHeaderCellDef>Nr</th>
                <td mat-cell *matCellDef="let row">{{ row.rowNumber }}</td>
              </ng-container>

              <ng-container matColumnDef="excelName">
                <th mat-header-cell *matHeaderCellDef>Name (Excel)</th>
                <td mat-cell *matCellDef="let row">
                  <strong>{{ row.excelLastName }}</strong> {{ row.excelFirstName }}
                </td>
              </ng-container>

              <ng-container matColumnDef="matchedMember">
                <th mat-header-cell *matHeaderCellDef>Zugeordnetes Mitglied</th>
                <td mat-cell *matCellDef="let row">
                  <div *ngIf="!row.editing">
                    <span *ngIf="row.matchedMemberName">{{ row.matchedMemberName }}</span>
                    <span *ngIf="!row.matchedMemberName" class="muted">– nicht zugeordnet –</span>
                    <button mat-icon-button (click)="startEditing(row)" matTooltip="Manuell zuordnen">
                      <mat-icon class="small-icon">edit</mat-icon>
                    </button>
                  </div>
                  <div *ngIf="row.editing" class="search-field">
                    <mat-form-field appearance="outline" class="inline-search" subscriptSizing="dynamic">
                      <input matInput
                             [(ngModel)]="row.searchText"
                             (ngModelChange)="searchMembers(row)"
                             placeholder="Mitglied suchen..."
                             [matAutocomplete]="auto">
                      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="assignMember(row, $event.option.value)">
                        <mat-option *ngFor="let m of row.searchResults" [value]="m">
                          {{ m.lastName }} {{ m.firstName }}
                        </mat-option>
                      </mat-autocomplete>
                    </mat-form-field>
                    <button mat-icon-button (click)="cancelEditing(row)"><mat-icon>close</mat-icon></button>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="confidence">
                <th mat-header-cell *matHeaderCellDef>Konfidenz</th>
                <td mat-cell *matCellDef="let row">
                  <span class="status-badge"
                        [ngClass]="{'status-high': row.confidence >= 85, 'status-medium': row.confidence >= 60 && row.confidence < 85, 'status-low': row.confidence < 60}">
                    {{ row.confidence }}%
                  </span>
                </td>
              </ng-container>

              <ng-container *ngFor="let year of preview.years" [matColumnDef]="'y' + year">
                <th mat-header-cell *matHeaderCellDef>{{ year }}</th>
                <td mat-cell *matCellDef="let row"
                    [ngClass]="{'cell-paid': row.yearPayments[year], 'cell-unpaid': !row.yearPayments[year]}">
                  {{ row.yearPayments[year] ? row.yearPayments[year] : '–' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="note">
                <th mat-header-cell *matHeaderCellDef>Notiz</th>
                <td mat-cell *matCellDef="let row" class="note-cell">{{ row.note }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                  [ngClass]="{'row-unmatched': row.status === 'UNMATCHED', 'row-low': row.status === 'LOW_CONFIDENCE'}">
              </tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>

    <!-- Done -->
    <mat-card *ngIf="importDone">
      <mat-card-content>
        <h3 class="success-text">Import abgeschlossen!</h3>
        <p>{{ importedPayments }} Jahresbeiträge wurden erfolgreich importiert.</p>
        <button mat-raised-button color="primary" (click)="reset()">Neuer Import</button>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .upload-icon { font-size: 48px; width: 48px; height: 48px; color: #999; }
    .file-name { margin-top: 8px; }
    .progress { margin: 16px 0; }
    .muted { color: #999; }

    .fee-import-table td { padding: 4px 8px !important; }
    .fee-import-table th { padding: 4px 8px !important; white-space: nowrap; }
    .cell-paid { color: #2e7d32; font-weight: 500; }
    .cell-unpaid { color: #ccc; }
    .row-unmatched { background-color: #fff8f8; }
    .row-low { background-color: #fffde7; }
    .search-field { display: flex; align-items: center; gap: 4px; }
    .inline-search { width: 200px; }
    .small-icon { font-size: 18px; }
    .note-cell { max-width: 200px; font-size: 11px; color: #666; }
    .success-text { color: #2e7d32; }

    @media (max-width: 767px) {
      .inline-search { width: 150px; }
      .fee-import-table { font-size: 12px; }
    }
  `]
})
export class FeeImportComponent {
  selectedFile: File | null = null;
  preview: FeeImportResult | null = null;
  loading = false;
  importing = false;
  importDone = false;
  importedPayments = 0;
  displayedColumns: string[] = [];

  private searchTimeout: any;

  constructor(private api: ApiService, private notify: NotificationService) {}

  get selectedCount(): number {
    return this.preview?.rows.filter(r => r.selected && r.matchedMemberId).length ?? 0;
  }

  get allSelected(): boolean {
    if (!this.preview) return false;
    const selectable = this.preview.rows.filter(r => r.matchedMemberId);
    return selectable.length > 0 && selectable.every(r => r.selected);
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    if (this.selectedFile) this.uploadPreview();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) { this.selectedFile = file; this.uploadPreview(); }
  }

  uploadPreview() {
    if (!this.selectedFile) return;
    this.loading = true;
    this.preview = null;
    this.importDone = false;
    this.api.upload<FeeImportResult>('/api/fee-import/preview', this.selectedFile).subscribe({
      next: (res) => {
        res.rows.forEach(r => {
          r.selected = r.status === 'MATCHED';
          r.editing = false;
          r.searchText = '';
          r.searchResults = [];
        });
        this.preview = res;
        this.displayedColumns = [
          'select', 'nr', 'excelName', 'matchedMember', 'confidence',
          ...res.years.map(y => 'y' + y),
          'note'
        ];
        this.loading = false;
      },
      error: () => { this.notify.error('Vorschau fehlgeschlagen'); this.loading = false; }
    });
  }

  toggleAll(checked: boolean) {
    this.preview?.rows.forEach(r => {
      if (r.matchedMemberId) r.selected = checked;
    });
  }

  selectAllMatched() {
    this.preview?.rows.forEach(r => {
      r.selected = r.confidence >= 85 && !!r.matchedMemberId;
    });
  }

  startEditing(row: FeeImportRow) {
    row.editing = true;
    row.searchText = row.excelLastName + ' ' + row.excelFirstName;
    this.searchMembers(row);
  }

  cancelEditing(row: FeeImportRow) {
    row.editing = false;
    row.searchText = '';
    row.searchResults = [];
  }

  searchMembers(row: FeeImportRow) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      if (!row.searchText || row.searchText.length < 2) {
        row.searchResults = [];
        return;
      }
      this.api.get<any>('/api/members', { search: row.searchText, size: 10 }).subscribe({
        next: (res) => row.searchResults = res.content || [],
        error: () => row.searchResults = []
      });
    }, 300);
  }

  assignMember(row: FeeImportRow, member: any) {
    row.matchedMemberId = member.id;
    row.matchedMemberName = member.lastName + ' ' + member.firstName;
    row.confidence = 100;
    row.status = 'MATCHED';
    row.selected = true;
    row.editing = false;
  }

  confirmImport() {
    if (!this.preview) return;
    const confirmations = this.preview.rows
      .filter(r => r.selected && r.matchedMemberId)
      .map(r => ({
        memberId: r.matchedMemberId,
        yearPayments: r.yearPayments
      }));

    if (confirmations.length === 0) {
      this.notify.error('Keine Einträge ausgewählt');
      return;
    }

    this.importing = true;
    this.api.post<any>('/api/fee-import/confirm', confirmations).subscribe({
      next: (res) => {
        this.importedPayments = res.importedPayments;
        this.importDone = true;
        this.importing = false;
        this.notify.success('Import erfolgreich');
      },
      error: () => { this.notify.error('Import fehlgeschlagen'); this.importing = false; }
    });
  }

  reset() {
    this.selectedFile = null;
    this.preview = null;
    this.importDone = false;
    this.importedPayments = 0;
  }
}
