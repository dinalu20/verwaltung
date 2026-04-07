import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

interface PreviewLine {
  id: number;
  bookingDate: string | null;
  bookingText: string | null;
  amount: number;
  suggestedMemberId: number | null;
  suggestedMemberName: string | null;
  matchConfidence: number;
  isDebit: boolean;
  selected: boolean;
  expanded: boolean;
}

@Component({
  selector: 'app-bank-import',
  standalone: true,
  imports: [
    CommonModule, DecimalPipe,
    MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatProgressBarModule, MatCheckboxModule, MatChipsModule, MatTooltipModule
  ],
  template: `
    <div class="page-header">
      <h2>Bankimport</h2>
    </div>

    <!-- Upload Area (hidden during preview) -->
    <mat-card class="upload-card" *ngIf="!previewLines.length">
      <mat-card-content>
        <div class="upload-area" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
          <mat-icon class="upload-icon">account_balance</mat-icon>
          <p>Bank CSV/Excel hierher ziehen oder</p>
          <button mat-raised-button color="primary" (click)="fileInput.click()">Datei auswählen</button>
          <input #fileInput type="file" accept=".csv,.xlsx,.xls" (change)="onFileSelected($event)" hidden>
        </div>
        <mat-progress-bar *ngIf="uploading" mode="indeterminate"></mat-progress-bar>
      </mat-card-content>
    </mat-card>

    <!-- Preview Section -->
    <ng-container *ngIf="previewLines.length > 0">
      <mat-card class="preview-header-card">
        <mat-card-content>
          <div class="preview-header">
            <div>
              <h3>Vorschau: {{ previewFileName }}</h3>
              <p class="preview-subtitle">Prüfe die Einträge und wähle aus, welche importiert werden sollen.</p>
            </div>
            <div class="preview-actions">
              <button mat-button (click)="cancelPreview()">
                <mat-icon>close</mat-icon> Abbrechen
              </button>
              <button mat-raised-button color="primary" (click)="confirmImport()" [disabled]="importing || selectedCount === 0">
                <mat-icon>check</mat-icon> {{ selectedCount }} Einträge importieren
              </button>
            </div>
          </div>
          <mat-progress-bar *ngIf="importing" mode="indeterminate"></mat-progress-bar>
        </mat-card-content>
      </mat-card>

      <!-- Preview Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">{{ previewLines.length }}</div>
          <div class="stat-label">Gesamt</div>
        </div>
        <div class="stat-card credit">
          <div class="stat-value">{{ creditLines.length }}</div>
          <div class="stat-label">Gutschriften</div>
          <div class="stat-amount">CHF {{ creditTotal | number:'1.2-2' }}</div>
        </div>
        <div class="stat-card debit">
          <div class="stat-value">{{ debitLines.length }}</div>
          <div class="stat-label">Belastungen</div>
          <div class="stat-amount">CHF {{ debitTotal | number:'1.2-2' }}</div>
        </div>
        <div class="stat-card selected-card">
          <div class="stat-value">{{ selectedCount }}</div>
          <div class="stat-label">Ausgewählt</div>
        </div>
      </div>

      <!-- Quick select / filter -->
      <div class="filter-bar">
        <mat-chip-set>
          <mat-chip [highlighted]="previewFilter === 'all'" (click)="setPreviewFilter('all')">
            Alle ({{ previewLines.length }})
          </mat-chip>
          <mat-chip [highlighted]="previewFilter === 'credits'" (click)="setPreviewFilter('credits')">
            Gutschriften ({{ creditLines.length }})
          </mat-chip>
          <mat-chip [highlighted]="previewFilter === 'debits'" (click)="setPreviewFilter('debits')">
            Belastungen ({{ debitLines.length }})
          </mat-chip>
          <mat-chip [highlighted]="previewFilter === 'matched'" (click)="setPreviewFilter('matched')">
            Mit Mitglied ({{ matchedCount }})
          </mat-chip>
        </mat-chip-set>
        <div class="bulk-actions">
          <button mat-button (click)="selectAll(true)">Alle auswählen</button>
          <button mat-button (click)="selectAll(false)">Keine auswählen</button>
          <button mat-button color="primary" (click)="selectOnlyCredits()">Nur Gutschriften</button>
        </div>
      </div>

      <!-- Preview Table -->
      <mat-card>
        <mat-card-content>
          <div class="table-responsive">
            <table mat-table [dataSource]="filteredPreviewLines" class="full-width">

              <ng-container matColumnDef="select">
                <th mat-header-cell *matHeaderCellDef style="width:48px">
                  <mat-checkbox [checked]="allFilteredSelected()" [indeterminate]="someFilteredSelected()"
                                (change)="toggleFilteredSelection($event.checked)"></mat-checkbox>
                </th>
                <td mat-cell *matCellDef="let l">
                  <mat-checkbox [checked]="l.selected" (change)="l.selected = $event.checked; updateCounts()"></mat-checkbox>
                </td>
              </ng-container>

              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Datum</th>
                <td mat-cell *matCellDef="let l">{{ l.bookingDate }}</td>
              </ng-container>

              <ng-container matColumnDef="text">
                <th mat-header-cell *matHeaderCellDef>Buchungstext</th>
                <td mat-cell *matCellDef="let l" class="text-cell" (click)="l.expanded = !l.expanded">
                  <div [class.text-expanded]="l.expanded" [class.text-truncated]="!l.expanded">
                    {{ l.bookingText || '-' }}
                  </div>
                  <mat-icon class="expand-icon" *ngIf="l.bookingText && l.bookingText.length > 50">
                    {{ l.expanded ? 'expand_less' : 'expand_more' }}
                  </mat-icon>
                </td>
              </ng-container>

              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>Betrag</th>
                <td mat-cell *matCellDef="let l" [class.debit-amount]="l.isDebit" [class.credit-amount]="!l.isDebit">
                  <span *ngIf="l.isDebit">-</span>CHF {{ l.amount | number:'1.2-2' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="match">
                <th mat-header-cell *matHeaderCellDef>Mitglied-Vorschlag</th>
                <td mat-cell *matCellDef="let l">
                  <span *ngIf="l.suggestedMemberName" class="match-badge">
                    {{ l.suggestedMemberName }}
                    <span class="conf-badge" [class.conf-high]="l.matchConfidence >= 80"
                          [class.conf-medium]="l.matchConfidence >= 50 && l.matchConfidence < 80"
                          [class.conf-low]="l.matchConfidence < 50">
                      {{ l.matchConfidence }}%
                    </span>
                  </span>
                  <span *ngIf="!l.suggestedMemberName" class="muted">-</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>Typ</th>
                <td mat-cell *matCellDef="let l">
                  <span class="type-chip" [class.type-credit]="!l.isDebit" [class.type-debit]="l.isDebit">
                    {{ l.isDebit ? 'Belastung' : 'Gutschrift' }}
                  </span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="previewCols"></tr>
              <tr mat-row *matRowDef="let row; columns: previewCols;"
                  [class.debit-row]="row.isDebit"
                  [class.unselected-row]="!row.selected"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Bottom confirm bar -->
      <div class="bottom-bar">
        <button mat-raised-button color="primary" (click)="confirmImport()" [disabled]="importing || selectedCount === 0">
          <mat-icon>cloud_upload</mat-icon> {{ selectedCount }} Einträge jetzt importieren
        </button>
      </div>
    </ng-container>

    <!-- Past Imports -->
    <mat-card *ngIf="imports.length > 0 && !previewLines.length">
      <mat-card-content>
        <h3>Bisherige Imports</h3>
        <div class="table-responsive">
          <table mat-table [dataSource]="imports" class="full-width">
            <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Datum</th><td mat-cell *matCellDef="let i">{{ i.importDate }}</td></ng-container>
            <ng-container matColumnDef="file"><th mat-header-cell *matHeaderCellDef>Datei</th><td mat-cell *matCellDef="let i">{{ i.fileName }}</td></ng-container>
            <ng-container matColumnDef="total"><th mat-header-cell *matHeaderCellDef>Zeilen</th><td mat-cell *matCellDef="let i">{{ i.totalLines }}</td></ng-container>
            <ng-container matColumnDef="pending"><th mat-header-cell *matHeaderCellDef>Offen</th><td mat-cell *matCellDef="let i">{{ i.pendingLines }}</td></ng-container>
            <ng-container matColumnDef="confirmed"><th mat-header-cell *matHeaderCellDef>Bestätigt</th><td mat-cell *matCellDef="let i">{{ i.confirmedLines }}</td></ng-container>
            <ng-container matColumnDef="action"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let i">
              <button mat-button color="primary" (click)="openImport(i)">Details</button>
              <button mat-icon-button color="warn" (click)="deleteImport(i, $event)" matTooltip="Import löschen">
                <mat-icon>delete</mat-icon>
              </button>
            </td></ng-container>
            <tr mat-header-row *matHeaderRowDef="importCols"></tr>
            <tr mat-row *matRowDef="let row; columns: importCols;"></tr>
          </table>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .upload-card { margin-bottom: 24px; }
    .upload-icon { font-size: 48px; width: 48px; height: 48px; color: #999; }

    .preview-header-card { margin-bottom: 16px; }
    .preview-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
    .preview-header h3 { margin: 0 0 4px; }
    .preview-subtitle { color: #64748b; margin: 0; font-size: 14px; }
    .preview-actions { display: flex; gap: 8px; align-items: center; }

    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .stat-card { background: white; border-radius: 12px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-left: 4px solid #94a3b8; }
    .stat-card.credit { border-left-color: #10b981; }
    .stat-card.debit { border-left-color: #ef4444; }
    .stat-card.selected-card { border-left-color: #3b82f6; }
    .stat-value { font-size: 24px; font-weight: 700; color: #1e293b; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-amount { font-size: 13px; font-weight: 500; margin-top: 2px; color: #475569; }

    .filter-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
    .filter-bar mat-chip { cursor: pointer; }
    .bulk-actions { display: flex; gap: 4px; }
    .bulk-actions button { font-size: 13px; }

    .text-cell { cursor: pointer; max-width: 300px; }
    .text-truncated { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }
    .text-expanded { white-space: pre-line; max-width: 300px; word-break: break-word; }
    .expand-icon { font-size: 16px; width: 16px; height: 16px; color: #94a3b8; vertical-align: middle; cursor: pointer; }

    .debit-amount { color: #ef4444; font-weight: 500; }
    .credit-amount { color: #10b981; font-weight: 500; }
    .debit-row { background-color: #fef2f2 !important; }
    .unselected-row { opacity: 0.45; }
    .muted { color: #94a3b8; }

    .match-badge { display: inline-flex; align-items: center; gap: 6px; }
    .conf-badge { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 600; }
    .conf-high { background: #dcfce7; color: #166534; }
    .conf-medium { background: #fef3c7; color: #92400e; }
    .conf-low { background: #fee2e2; color: #991b1b; }

    .type-chip { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 500; }
    .type-credit { background: #dcfce7; color: #166534; }
    .type-debit { background: #fee2e2; color: #991b1b; }

    .bottom-bar { position: sticky; bottom: 0; padding: 16px; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); text-align: center; margin-top: 16px; border-top: 1px solid #e2e8f0; border-radius: 12px; }

    @media (max-width: 767px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .preview-header { flex-direction: column; }
      .text-cell, .text-truncated { max-width: 150px; }
      .filter-bar { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class BankImportComponent implements OnInit {
  imports: any[] = [];
  importCols = ['date', 'file', 'total', 'pending', 'confirmed', 'action'];
  previewCols = ['select', 'date', 'text', 'amount', 'match', 'type'];

  uploading = false;
  importing = false;

  previewLines: PreviewLine[] = [];
  filteredPreviewLines: PreviewLine[] = [];
  previewFilter = 'all';
  previewFileName = '';
  previewFile: File | null = null;

  selectedCount = 0;
  matchedCount = 0;
  creditLines: PreviewLine[] = [];
  debitLines: PreviewLine[] = [];
  creditTotal = 0;
  debitTotal = 0;

  constructor(
    private api: ApiService,
    private http: HttpClient,
    private router: Router,
    private notify: NotificationService
  ) {}

  ngOnInit() { this.loadImports(); }

  loadImports() { this.api.get<any[]>('/api/bank-imports').subscribe(d => this.imports = d); }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.uploadPreview(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.uploadPreview(file);
  }

  uploadPreview(file: File) {
    this.uploading = true;
    this.previewFile = file;
    this.previewFileName = file.name;

    this.api.upload<any[]>('/api/bank-imports/preview', file).subscribe({
      next: (lines) => {
        this.uploading = false;
        this.previewLines = (lines || []).map((l: any) => ({
          ...l,
          isDebit: l.isDebit === true,
          selected: !l.isDebit, // pre-select credits, deselect debits
          expanded: false
        }));
        this.computeStats();
        this.applyPreviewFilter();
        this.notify.success(`${this.previewLines.length} Einträge gelesen`);
      },
      error: () => {
        this.uploading = false;
        this.notify.error('Datei konnte nicht gelesen werden');
      }
    });
  }

  cancelPreview() {
    this.previewLines = [];
    this.filteredPreviewLines = [];
    this.previewFile = null;
    this.previewFileName = '';
  }

  confirmImport() {
    if (!this.previewFile) return;
    this.importing = true;

    const selectedIndices = this.previewLines
        .filter(l => l.selected)
        .map(l => l.id);

    const formData = new FormData();
    formData.append('file', this.previewFile);
    formData.append('selectedIndices', selectedIndices.join(','));

    this.http.post<any>('/api/bank-imports', formData).subscribe({
      next: (res) => {
        this.importing = false;
        this.notify.success(`${selectedIndices.length} Einträge importiert`);
        this.cancelPreview();
        this.router.navigate(['/bank-import', res.id]);
      },
      error: () => {
        this.importing = false;
        this.notify.error('Import fehlgeschlagen');
      }
    });
  }

  // ── Preview filters & stats ────────────────────────────────────────

  computeStats() {
    this.creditLines = this.previewLines.filter(l => !l.isDebit);
    this.debitLines = this.previewLines.filter(l => l.isDebit);
    this.creditTotal = this.creditLines.reduce((s, l) => s + (l.amount || 0), 0);
    this.debitTotal = this.debitLines.reduce((s, l) => s + (l.amount || 0), 0);
    this.matchedCount = this.previewLines.filter(l => l.suggestedMemberName).length;
    this.updateCounts();
  }

  updateCounts() {
    this.selectedCount = this.previewLines.filter(l => l.selected).length;
  }

  setPreviewFilter(filter: string) {
    this.previewFilter = filter;
    this.applyPreviewFilter();
  }

  applyPreviewFilter() {
    switch (this.previewFilter) {
      case 'credits': this.filteredPreviewLines = this.creditLines; break;
      case 'debits': this.filteredPreviewLines = this.debitLines; break;
      case 'matched': this.filteredPreviewLines = this.previewLines.filter(l => l.suggestedMemberName); break;
      default: this.filteredPreviewLines = [...this.previewLines];
    }
  }

  selectAll(selected: boolean) {
    this.previewLines.forEach(l => l.selected = selected);
    this.updateCounts();
  }

  selectOnlyCredits() {
    this.previewLines.forEach(l => l.selected = !l.isDebit);
    this.updateCounts();
  }

  allFilteredSelected(): boolean {
    return this.filteredPreviewLines.length > 0 && this.filteredPreviewLines.every(l => l.selected);
  }

  someFilteredSelected(): boolean {
    const sel = this.filteredPreviewLines.filter(l => l.selected).length;
    return sel > 0 && sel < this.filteredPreviewLines.length;
  }

  toggleFilteredSelection(checked: boolean) {
    this.filteredPreviewLines.forEach(l => l.selected = checked);
    this.updateCounts();
  }

  deleteImport(imp: any, event: Event) {
    event.stopPropagation();
    if (!confirm(`Import "${imp.fileName}" wirklich löschen? Alle zugehörigen Buchungen werden ebenfalls gelöscht.`)) return;
    this.api.delete(`/api/bank-imports/${imp.id}`).subscribe({
      next: () => {
        this.notify.success('Import gelöscht');
        this.loadImports();
      },
      error: () => this.notify.error('Löschen fehlgeschlagen')
    });
  }

  openImport(imp: any) { this.router.navigate(['/bank-import', imp.id]); }
}
