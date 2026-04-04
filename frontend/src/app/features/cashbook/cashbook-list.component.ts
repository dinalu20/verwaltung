import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { CashBookCreateDialogComponent } from './cashbook-create-dialog.component';

@Component({
  selector: 'app-cashbook-list',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule, NgFor, NgIf, DecimalPipe],
  template: `
    <div class="page-header">
      <h2>Kassenbücher</h2>
      <button mat-raised-button color="primary" (click)="create()"><mat-icon>add</mat-icon> Neues Kassenbuch</button>
    </div>
    <div class="cards">
      <mat-card *ngFor="let book of cashBooks" class="book-card">
        <mat-card-header (click)="open(book)" style="cursor:pointer">
          <mat-card-title>{{ book.name }}</mat-card-title>
          <mat-card-subtitle>{{ bookTypeLabel(book.bookType) }} | {{ book.periodYear }}{{ book.periodMonth ? '/' + book.periodMonth : '' }} | {{ statusLabel(book.status) }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content (click)="open(book)" style="cursor:pointer">
          <div class="balance-row">
            <span>Eröffnung: CHF {{ book.openingBalance | number:'1.2-2' }}</span>
            <span style="color:#4caf50">+ CHF {{ book.totalIn | number:'1.2-2' }}</span>
            <span style="color:#f44336">- CHF {{ book.totalOut | number:'1.2-2' }}</span>
          </div>
          <div class="balance-total">Saldo: CHF {{ book.currentBalance | number:'1.2-2' }}</div>
        </mat-card-content>
        <mat-card-actions align="end">
          <button mat-icon-button color="warn" (click)="deleteCashBook($event, book)" matTooltip="Löschen">
            <mat-icon>delete</mat-icon>
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .balance-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
    .balance-total { font-size: 20px; font-weight: 600; text-align: right; margin-top: 8px; }
  `]
})
export class CashBookListComponent implements OnInit {
  cashBooks: any[] = [];
  constructor(private api: ApiService, private router: Router, private dialog: MatDialog, private notify: NotificationService) {}
  ngOnInit() { this.load(); }
  load() { this.api.get<any[]>('/api/cashbooks').subscribe(d => this.cashBooks = d); }
  open(book: any) { this.router.navigate(['/cashbooks', book.id]); }

  bookTypeLabel(type: string): string {
    const labels: Record<string, string> = { GENERAL: 'Allgemein', RAMADAN: 'Ramadan', CUSTOM: 'Benutzerdefiniert' };
    return labels[type] || type;
  }

  statusLabel(status: string): string {
    return status === 'OPEN' ? 'Offen' : 'Abgeschlossen';
  }

  create() {
    const ref = this.dialog.open(CashBookCreateDialogComponent, { width: '500px' });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.api.post('/api/cashbooks', result).subscribe(() => { this.notify.success('Kassenbuch erstellt'); this.load(); });
      }
    });
  }

  deleteCashBook(event: Event, book: any) {
    event.stopPropagation();
    if (confirm('Kassenbuch "' + book.name + '" und alle Einträge wirklich löschen?')) {
      this.api.delete(`/api/cashbooks/${book.id}`).subscribe({
        next: () => {
          this.notify.success('Kassenbuch gelöscht');
          this.load();
        },
        error: (err) => {
          this.notify.error('Fehler: ' + (err.error?.message || 'Unbekannt'));
        }
      });
    }
  }
}
