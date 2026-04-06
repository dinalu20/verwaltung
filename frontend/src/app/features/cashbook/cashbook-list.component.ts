import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { CashBookCreateDialogComponent } from './cashbook-create-dialog.component';

@Component({
  selector: 'app-cashbook-list',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule, MatTooltipModule, NgFor, NgIf, DecimalPipe],
  template: `
    <div class="page-header">
      <h2>Kassenbücher</h2>
      <div class="action-buttons">
        <button mat-raised-button color="primary" (click)="create()"><mat-icon>add</mat-icon> Neues Kassenbuch</button>
      </div>
    </div>
    <div class="cards">
      <mat-card *ngFor="let book of cashBooks" class="book-card">
        <mat-card-header (click)="open(book)" class="clickable">
          <mat-card-title>{{ book.name }}</mat-card-title>
          <mat-card-subtitle>{{ bookTypeLabel(book.bookType) }} | {{ book.periodYear }}{{ book.periodMonth ? '/' + book.periodMonth : '' }} | {{ statusLabel(book.status) }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content (click)="open(book)" class="clickable">
          <div class="balance-row">
            <span>Eröffnung: CHF {{ book.openingBalance | number:'1.2-2' }}</span>
            <span class="bal-in">+ CHF {{ book.totalIn | number:'1.2-2' }}</span>
            <span class="bal-out">- CHF {{ book.totalOut | number:'1.2-2' }}</span>
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
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }
    .book-card {
      border-left: 4px solid #0d9488 !important;
      transition: transform 0.2s ease, box-shadow 0.25s ease;
    }
    .book-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important;
    }
    .clickable { cursor: pointer; }
    .balance-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      font-size: 14px;
      gap: 8px;
      flex-wrap: wrap;
    }
    .bal-in { color: #059669; font-weight: 600; }
    .bal-out { color: #dc2626; font-weight: 600; }
    .balance-total {
      font-size: 22px;
      font-weight: 700;
      text-align: right;
      margin-top: 8px;
      padding: 8px 12px;
      background: #f8fafc;
      border-radius: 10px;
      letter-spacing: -0.01em;
    }

    @media (max-width: 767px) {
      .cards { grid-template-columns: 1fr; }
      .balance-row { flex-direction: column; gap: 4px; }
      .balance-total { font-size: 18px; padding: 6px 10px; }
    }
  `]
})
export class CashBookListComponent implements OnInit {
  cashBooks: any[] = [];
  constructor(
    private api: ApiService,
    private router: Router,
    private dialog: MatDialog,
    private notify: NotificationService,
    private breakpointObserver: BreakpointObserver
  ) {}
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
    const isMobile = this.breakpointObserver.isMatched('(max-width: 767px)');
    const ref = this.dialog.open(CashBookCreateDialogComponent, {
      width: isMobile ? '100vw' : '500px',
      maxWidth: isMobile ? '100vw' : '500px',
      height: isMobile ? '100vh' : 'auto',
    });
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
