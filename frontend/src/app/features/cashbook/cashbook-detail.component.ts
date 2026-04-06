import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIf, NgFor, DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-cashbook-entry-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Eintrag bearbeiten' : 'Neuer Eintrag' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Datum</mat-label>
        <input matInput type="date" [(ngModel)]="entry.entryDate" required>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Beschreibung</mat-label>
        <input matInput [(ngModel)]="entry.description" required>
      </mat-form-field>
      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>Eingang (CHF)</mat-label>
          <input matInput type="number" [(ngModel)]="entry.amountIn" step="0.01">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Ausgang (CHF)</mat-label>
          <input matInput type="number" [(ngModel)]="entry.amountOut" step="0.01">
        </mat-form-field>
      </div>
      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>Belegnummer</mat-label>
          <input matInput [(ngModel)]="entry.receiptNumber">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Empfänger</mat-label>
          <input matInput [(ngModel)]="entry.recipient">
        </mat-form-field>
      </div>
      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>Konto</mat-label>
          <input matInput [(ngModel)]="entry.account">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Genehmigt von</mat-label>
          <input matInput [(ngModel)]="entry.approvedBy">
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Abbrechen</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!entry.entryDate || !entry.description">Speichern</button>
    </mat-dialog-actions>
  `
})
export class CashBookEntryDialogComponent {
  entry: any = { entryDate: new Date().toISOString().split('T')[0], amountIn: 0, amountOut: 0 };
  isEdit = false;
  constructor(
    private dialogRef: MatDialogRef<CashBookEntryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    if (data?.entry) {
      this.entry = { ...data.entry };
      this.isEdit = true;
    }
  }
  save() { this.dialogRef.close(this.entry); }
}

@Component({
  selector: 'app-cashbook-detail',
  standalone: true,
  imports: [MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule, NgIf, DecimalPipe, FormsModule],
  template: `
    <div class="page-header" *ngIf="cashBook">
      <h2>{{ cashBook.name }}</h2>
      <div>
        <button mat-raised-button (click)="downloadPdf()" style="margin-right:8px">
          <mat-icon>picture_as_pdf</mat-icon> PDF
        </button>
        <button mat-raised-button (click)="downloadCsv()" style="margin-right:8px">
          <mat-icon>description</mat-icon> CSV
        </button>
        <button mat-raised-button (click)="downloadExcel()" style="margin-right:8px">
          <mat-icon>table_chart</mat-icon> Excel
        </button>
        <button mat-raised-button color="primary" (click)="addEntry()" style="margin-right:8px">
          <mat-icon>add</mat-icon> Neuer Eintrag
        </button>
        <button mat-raised-button color="warn" (click)="deleteCashBook()">
          <mat-icon>delete</mat-icon> Löschen
        </button>
      </div>
    </div>

    <mat-card *ngIf="cashBook" style="margin-bottom:16px">
      <mat-card-content>
        <div style="display:flex;gap:32px;font-size:16px;flex-wrap:wrap">
          <span *ngIf="!editingBalance" style="cursor:pointer" (click)="startEditBalance()" matTooltip="Klicken zum Bearbeiten">
            Eröffnung: <strong>CHF {{ cashBook.openingBalance | number:'1.2-2' }}</strong> <mat-icon style="font-size:14px;vertical-align:middle;color:#999">edit</mat-icon>
          </span>
          <span *ngIf="editingBalance" class="edit-balance">
            Eröffnung: CHF <input type="number" [(ngModel)]="editBalance" step="0.01" class="balance-input">
            <button mat-icon-button color="primary" (click)="saveBalance()" matTooltip="Speichern"><mat-icon>check</mat-icon></button>
            <button mat-icon-button (click)="cancelEditBalance()" matTooltip="Abbrechen"><mat-icon>close</mat-icon></button>
          </span>
          <span style="color:#4caf50">Eingänge: <strong>CHF {{ cashBook.totalIn | number:'1.2-2' }}</strong></span>
          <span style="color:#f44336">Ausgänge: <strong>CHF {{ cashBook.totalOut | number:'1.2-2' }}</strong></span>
          <span>Saldo: <strong>CHF {{ cashBook.currentBalance | number:'1.2-2' }}</strong></span>
        </div>
      </mat-card-content>
    </mat-card>

    <mat-card *ngIf="cashBook">
      <mat-card-content>
        <table mat-table [dataSource]="cashBook.entries || []" class="full-width">
          <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Datum</th><td mat-cell *matCellDef="let e">{{ e.entryDate }}</td></ng-container>
          <ng-container matColumnDef="receipt"><th mat-header-cell *matHeaderCellDef>Beleg Nr.</th><td mat-cell *matCellDef="let e">{{ e.receiptNumber || '-' }}</td></ng-container>
          <ng-container matColumnDef="description"><th mat-header-cell *matHeaderCellDef>Beschreibung</th><td mat-cell *matCellDef="let e">{{ e.description }}</td></ng-container>
          <ng-container matColumnDef="amountIn"><th mat-header-cell *matHeaderCellDef>Eingang</th><td mat-cell *matCellDef="let e" style="color:#4caf50">{{ e.amountIn > 0 ? ('CHF ' + (e.amountIn | number:'1.2-2')) : '' }}</td></ng-container>
          <ng-container matColumnDef="amountOut"><th mat-header-cell *matHeaderCellDef>Ausgang</th><td mat-cell *matCellDef="let e" style="color:#f44336">{{ e.amountOut > 0 ? ('CHF ' + (e.amountOut | number:'1.2-2')) : '' }}</td></ng-container>
          <ng-container matColumnDef="balance"><th mat-header-cell *matHeaderCellDef>Saldo</th><td mat-cell *matCellDef="let e"><strong>CHF {{ e.runningBalance | number:'1.2-2' }}</strong></td></ng-container>
          <ng-container matColumnDef="recipient"><th mat-header-cell *matHeaderCellDef>Empfänger</th><td mat-cell *matCellDef="let e">{{ e.recipient || '-' }}</td></ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let e">
              <button mat-icon-button matTooltip="Bearbeiten" (click)="editEntry(e)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" matTooltip="Löschen" (click)="deleteEntry(e)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
        <p *ngIf="!cashBook.entries || cashBook.entries.length === 0" style="padding:16px;text-align:center;color:#999">Keine Einträge vorhanden.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .edit-balance { display: inline-flex; align-items: center; gap: 4px; }
    .balance-input { width: 100px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px; font-weight: 600; text-align: right; }
    .balance-input:focus { outline: none; border-color: #1976d2; }
  `]
})
export class CashBookDetailComponent implements OnInit {
  cashBook: any = null;
  editingBalance = false;
  editBalance = 0;
  columns = ['date', 'receipt', 'description', 'amountIn', 'amountOut', 'balance', 'recipient', 'actions'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private dialog: MatDialog,
    private notify: NotificationService
  ) {}

  ngOnInit() { this.load(); }

  load() {
    const id = this.route.snapshot.paramMap.get('id');
    this.api.get<any>(`/api/cashbooks/${id}`).subscribe(d => this.cashBook = d);
  }

  startEditBalance() {
    this.editBalance = this.cashBook.openingBalance;
    this.editingBalance = true;
  }

  cancelEditBalance() {
    this.editingBalance = false;
  }

  saveBalance() {
    this.api.put(`/api/cashbooks/${this.cashBook.id}`, { openingBalance: this.editBalance }).subscribe({
      next: (updated: any) => {
        this.cashBook = updated;
        this.editingBalance = false;
        this.notify.success('Eröffnungssaldo aktualisiert');
      },
      error: (err) => this.notify.error('Fehler: ' + (err.error?.message || 'Unbekannt'))
    });
  }

  addEntry() {
    const ref = this.dialog.open(CashBookEntryDialogComponent, { width: '600px', data: {} });
    ref.afterClosed().subscribe(result => {
      if (result) {
        result.cashBookId = this.cashBook.id;
        this.api.post('/api/cashbooks/entries', result).subscribe(() => { this.notify.success('Eintrag erstellt'); this.load(); });
      }
    });
  }

  editEntry(entry: any) {
    const ref = this.dialog.open(CashBookEntryDialogComponent, { width: '600px', data: { entry } });
    ref.afterClosed().subscribe(result => {
      if (result) {
        result.cashBookId = this.cashBook.id;
        this.api.put(`/api/cashbooks/entries/${entry.id}`, result).subscribe(() => { this.notify.success('Eintrag aktualisiert'); this.load(); });
      }
    });
  }

  deleteEntry(entry: any) {
    if (confirm('Eintrag "' + entry.description + '" wirklich löschen?')) {
      this.api.delete(`/api/cashbooks/entries/${entry.id}`).subscribe({
        next: () => { this.notify.success('Eintrag gelöscht'); this.load(); },
        error: (err) => this.notify.error('Fehler: ' + (err.error?.message || 'Unbekannt'))
      });
    }
  }

  downloadPdf() {
    this.api.downloadPdf(
      `/api/cashbooks/${this.cashBook.id}/pdf`,
      this.cashBook.name.replace(/[^a-zA-Z0-9äöüÄÖÜ\-_ ]/g, '') + '.pdf'
    );
  }

  downloadCsv() {
    this.api.downloadFile(
      `/api/cashbooks/${this.cashBook.id}/csv`,
      this.cashBook.name.replace(/[^a-zA-Z0-9äöüÄÖÜ\-_ ]/g, '') + '.csv'
    );
  }

  downloadExcel() {
    this.api.downloadFile(
      `/api/cashbooks/${this.cashBook.id}/excel`,
      this.cashBook.name.replace(/[^a-zA-Z0-9äöüÄÖÜ\-_ ]/g, '') + '.xlsx'
    );
  }

  deleteCashBook() {
    if (confirm('Kassenbuch "' + this.cashBook.name + '" und alle Einträge wirklich löschen?')) {
      this.api.delete(`/api/cashbooks/${this.cashBook.id}`).subscribe({
        next: () => {
          this.notify.success('Kassenbuch gelöscht');
          this.router.navigate(['/cashbooks']);
        },
        error: (err) => {
          this.notify.error('Fehler: ' + (err.error?.message || 'Unbekannt'));
        }
      });
    }
  }
}
