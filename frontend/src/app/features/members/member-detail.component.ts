import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { MemberFormDialogComponent } from './member-form-dialog.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-member-detail',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule, MatTabsModule, NgIf, NgFor, FormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="page-header" *ngIf="member">
      <h2>{{ member.lastName }} {{ member.firstName }}</h2>
      <div class="action-buttons">
        <button mat-raised-button (click)="edit()"><mat-icon>edit</mat-icon> Bearbeiten</button>
        <button mat-raised-button color="warn" (click)="deactivate()" *ngIf="member.status === 'ACTIVE'">Deaktivieren</button>
        <button mat-raised-button color="primary" (click)="reactivate()" *ngIf="member.status === 'INACTIVE'">Reaktivieren</button>
      </div>
    </div>

    <mat-card *ngIf="member" class="info-card">
      <mat-card-content>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">Adresse</span><span>{{ member.street }}</span></div>
          <div class="detail-item"><span class="detail-label">PLZ / Ort</span><span>{{ member.zipCode }} {{ member.city }}</span></div>
          <div class="detail-item"><span class="detail-label">Telefon Privat</span><span>{{ member.phonePrivate || '-' }}</span></div>
          <div class="detail-item"><span class="detail-label">Telefon Mobil</span><span>{{ member.phoneMobile || '-' }}</span></div>
          <div class="detail-item"><span class="detail-label">Status</span>
            <span class="status-badge" [class.status-paid]="member.status === 'ACTIVE'" [class.status-open]="member.status === 'INACTIVE'">
              {{ member.status === 'ACTIVE' ? 'Aktiv' : 'Inaktiv' }}
            </span>
          </div>
          <div class="detail-item"><span class="detail-label">Externe ID</span><span>{{ member.externalId || '-' }}</span></div>
          <div class="detail-item" *ngIf="member.paymentNote"><span class="detail-label">Hinweis</span><span>{{ member.paymentNote }}</span></div>
        </div>
      </mat-card-content>
    </mat-card>

    <mat-tab-group>
      <mat-tab label="Jahresbeiträge">
        <div class="tab-content">
          <div class="fee-grid" *ngIf="feeYears.length > 0">
            <div class="fee-row fee-header">
              <span class="fee-year">Jahr</span>
              <span class="fee-amount">Soll</span>
              <span class="fee-amount">Bezahlt</span>
              <span class="fee-action">Aktion</span>
            </div>
            <div *ngFor="let f of feeYears" class="fee-row" [class.fee-paid]="f.status === 'PAID' || f.status === 'OVERPAID'">
              <span class="fee-year"><strong>{{ f.year }}</strong></span>
              <span class="fee-amount">CHF {{ f.amountDue }}</span>
              <span class="fee-amount">
                <span *ngIf="f.amountPaid > 0" class="paid-amount">CHF {{ f.amountPaid }}</span>
                <span *ngIf="f.amountPaid === 0" class="no-amount">-</span>
              </span>
              <span class="fee-action">
                <span *ngIf="f.status !== 'PAID' && f.status !== 'OVERPAID' && canEdit" class="pay-inline">
                  <span class="amount-field">CHF</span>
                  <input type="number" [(ngModel)]="f.payAmount" min="0.01" step="0.01" class="amount-input">
                  <button mat-raised-button color="primary"
                          class="pay-btn"
                          (click)="quickPay(f.year)"
                          [disabled]="f.loading || !f.payAmount || f.payAmount <= 0">
                    <mat-icon>check_circle</mat-icon> <span class="pay-label">Bezahlt</span>
                  </button>
                </span>
                <span *ngIf="(f.status === 'PAID' || f.status === 'OVERPAID') && !canEdit" class="paid-label">
                  <mat-icon class="paid-icon">check_circle</mat-icon> Bezahlt
                </span>
                <span *ngIf="(f.status === 'PAID' || f.status === 'OVERPAID') && canEdit" class="paid-with-undo">
                  <mat-icon class="paid-icon">check_circle</mat-icon>
                  <span class="paid-text">Bezahlt</span>
                  <button mat-stroked-button color="warn"
                          class="undo-btn"
                          (click)="undoPay(f.year)"
                          [disabled]="f.loading">
                    <mat-icon>undo</mat-icon> <span class="undo-label">Rückgängig</span>
                  </button>
                </span>
              </span>
            </div>
          </div>
          <p *ngIf="feeYears.length === 0" class="empty-text">Keine Daten vorhanden.</p>
        </div>
      </mat-tab>
      <mat-tab label="Zahlungen">
        <div class="tab-content">
          <div class="table-responsive">
            <table mat-table [dataSource]="payments" *ngIf="payments.length > 0">
              <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Datum</th><td mat-cell *matCellDef="let p">{{ p.paymentDate }}</td></ng-container>
              <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Betrag</th><td mat-cell *matCellDef="let p">CHF {{ p.amount }}</td></ng-container>
              <ng-container matColumnDef="purpose"><th mat-header-cell *matHeaderCellDef>Zweck</th><td mat-cell *matCellDef="let p">{{ purposeLabel(p.purpose) }}</td></ng-container>
              <ng-container matColumnDef="year"><th mat-header-cell *matHeaderCellDef>Jahr</th><td mat-cell *matCellDef="let p">{{ p.forYear }}</td></ng-container>
              <ng-container matColumnDef="receipt"><th mat-header-cell *matHeaderCellDef>Quittung</th><td mat-cell *matCellDef="let p">
                <span *ngIf="p.receiptNumber">{{ p.receiptNumber }}</span>
                <span *ngIf="!p.receiptNumber">-</span>
              </td></ng-container>
              <tr mat-header-row *matHeaderRowDef="paymentCols"></tr>
              <tr mat-row *matRowDef="let row; columns: paymentCols;"></tr>
            </table>
          </div>
          <p *ngIf="payments.length === 0" class="empty-text">Keine Zahlungen vorhanden.</p>
        </div>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: [`
    .info-card {
      margin-bottom: 20px;
      border-top: 3px solid #0d9488 !important;
    }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; }
    .detail-item { display: flex; flex-direction: column; gap: 4px; }
    .detail-label {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
    }
    .detail-item span:not(.detail-label):not(.status-badge) {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text, #1e293b);
    }

    .tab-content { padding: 16px 0; }

    .fee-grid {
      border: none;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02);
    }
    .fee-row {
      display: grid;
      grid-template-columns: 70px 90px 90px 1fr;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
    }
    .fee-row:last-child { border-bottom: none; }
    .fee-row:nth-child(even):not(.fee-header) { background: #fafbfc; }
    .fee-header {
      background: #f8fafc;
      font-weight: 600;
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 2px solid #e2e8f0;
    }
    .fee-paid { background: #f0fdf4 !important; }
    .fee-year { font-size: 15px; }
    .fee-amount { font-size: 14px; }
    .fee-action { text-align: right; }

    .paid-amount { color: #059669; font-weight: 600; }
    .no-amount { color: #cbd5e1; }
    .pay-inline { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .amount-field { font-size: 13px; color: #64748b; }
    .amount-input {
      width: 70px;
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      text-align: right;
      transition: border-color 0.2s;
    }
    .amount-input:focus { outline: none; border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }
    .pay-btn { font-size: 13px; }
    .paid-label { color: #059669; font-weight: 500; font-size: 14px; }
    .paid-icon { color: #059669; vertical-align: middle; font-size: 20px; width: 20px; height: 20px; }
    .paid-with-undo { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .paid-text { color: #059669; font-weight: 500; margin-right: 8px; }
    .undo-btn { font-size: 12px; }
    .empty-text { padding: 16px; text-align: center; color: #94a3b8; }

    @media (max-width: 767px) {
      .detail-grid { grid-template-columns: 1fr; gap: 12px; }
      .fee-row {
        grid-template-columns: 1fr 1fr;
        gap: 4px 8px;
        padding: 12px;
      }
      .fee-header { display: none; }
      .fee-action { grid-column: 1 / -1; text-align: left; margin-top: 4px; }
      .pay-inline { flex-direction: row; }
      .pay-label, .undo-label { display: none; }
      .amount-input { width: 60px; }
    }
  `]
})
export class MemberDetailComponent implements OnInit {
  member: any;
  payments: any[] = [];
  feeYears: any[] = [];
  paymentCols = ['date', 'amount', 'purpose', 'year', 'receipt'];
  canEdit = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private dialog: MatDialog,
    private notify: NotificationService,
    private router: Router,
    private auth: AuthService,
    private breakpointObserver: BreakpointObserver
  ) {
    this.canEdit = auth.hasRole('ADMIN', 'KASSIER');
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.api.get<any>(`/api/members/${id}`).subscribe(m => this.member = m);
    this.loadPayments(id!);
    this.loadFees(id!);
  }

  loadPayments(id: string) {
    this.api.get<any>('/api/payments', { memberId: id, size: 100 }).subscribe(r => this.payments = r.content || []);
  }

  loadFees(id: string) {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push(y);
    }

    this.api.get<any[]>(`/api/members/${id}/fees`).subscribe(fees => {
      const feeMap = new Map<number, any>();
      for (const f of fees) {
        feeMap.set(f.year, f);
      }

      this.feeYears = years.map(y => {
        const existing = feeMap.get(y);
        const due = existing ? existing.amountDue : 300;
        const paid = existing ? existing.amountPaid : 0;
        return {
          year: y,
          amountDue: due,
          amountPaid: paid,
          status: existing ? existing.status : 'OPEN',
          payAmount: Math.max(due - paid, 0) || due,
          loading: false
        };
      });
    });
  }

  quickPay(year: number) {
    const fee = this.feeYears.find(f => f.year === year);
    if (!fee || !fee.payAmount || fee.payAmount <= 0) return;

    fee.loading = true;
    this.api.post(`/api/members/${this.member.id}/fees/${year}/quick-pay`, { amount: fee.payAmount }).subscribe({
      next: () => {
        fee.loading = false;
        this.notify.success(`${year}: CHF ${fee.payAmount} als bezahlt markiert`);
        this.loadFees(this.member.id);
        this.loadPayments(this.member.id);
      },
      error: (err) => {
        fee.loading = false;
        this.notify.error('Fehler: ' + (err.error?.message || 'Unbekannt'));
      }
    });
  }

  undoPay(year: number) {
    const fee = this.feeYears.find(f => f.year === year);
    if (!fee) return;

    fee.loading = true;
    this.api.post(`/api/members/${this.member.id}/fees/${year}/undo-pay`, {}).subscribe({
      next: () => {
        fee.amountPaid = 0;
        fee.status = 'OPEN';
        fee.loading = false;
        this.notify.success(`${year} zurückgesetzt`);
        this.loadPayments(this.member.id);
      },
      error: (err) => {
        fee.loading = false;
        this.notify.error('Fehler: ' + (err.error?.message || 'Unbekannt'));
      }
    });
  }

  purposeLabel(purpose: string): string {
    const labels: any = {
      MEMBERSHIP_FEE: 'Mitgliedsbeitrag', ZAKAT: 'Zakat', FITRA: 'Fitra',
      DONATION: 'Spende', OTHER: 'Sonstiges'
    };
    return labels[purpose] || purpose;
  }

  edit() {
    const isMobile = this.breakpointObserver.isMatched('(max-width: 767px)');
    const ref = this.dialog.open(MemberFormDialogComponent, {
      width: isMobile ? '100vw' : '600px',
      maxWidth: isMobile ? '100vw' : '600px',
      height: isMobile ? '100vh' : 'auto',
      data: this.member
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.api.put(`/api/members/${this.member.id}`, result).subscribe((m: any) => {
          this.member = m;
          this.notify.success('Gespeichert');
        });
      }
    });
  }

  deactivate() {
    if (confirm('Mitglied wirklich deaktivieren?')) {
      this.api.delete(`/api/members/${this.member.id}`).subscribe(() => {
        this.notify.success('Deaktiviert');
        this.router.navigate(['/members']);
      });
    }
  }

  reactivate() {
    this.api.post(`/api/members/${this.member.id}/reactivate`, {}).subscribe(() => {
      this.member.status = 'ACTIVE';
      this.notify.success('Reaktiviert');
    });
  }
}
