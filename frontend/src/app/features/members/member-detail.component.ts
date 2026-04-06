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
      <div>
        <button mat-raised-button (click)="edit()"><mat-icon>edit</mat-icon> Bearbeiten</button>
        <button mat-raised-button color="warn" (click)="deactivate()" *ngIf="member.status === 'ACTIVE'" style="margin-left:8px">Deaktivieren</button>
        <button mat-raised-button color="primary" (click)="reactivate()" *ngIf="member.status === 'INACTIVE'" style="margin-left:8px">Reaktivieren</button>
      </div>
    </div>

    <mat-card *ngIf="member" style="margin-bottom:16px">
      <mat-card-content>
        <div class="detail-grid">
          <div><strong>Adresse:</strong> {{ member.street }}</div>
          <div><strong>PLZ / Ort:</strong> {{ member.zipCode }} {{ member.city }}</div>
          <div><strong>Telefon Privat:</strong> {{ member.phonePrivate || '-' }}</div>
          <div><strong>Telefon Mobil:</strong> {{ member.phoneMobile || '-' }}</div>
          <div><strong>Status:</strong> {{ member.status }}</div>
          <div><strong>Externe ID:</strong> {{ member.externalId || '-' }}</div>
          <div *ngIf="member.paymentNote"><strong>Hinweis:</strong> {{ member.paymentNote }}</div>
        </div>
      </mat-card-content>
    </mat-card>

    <mat-tab-group>
      <mat-tab label="Jahresbeiträge">
        <div style="padding:16px">
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
                <span *ngIf="f.amountPaid > 0" style="color:#2e7d32;font-weight:600">CHF {{ f.amountPaid }}</span>
                <span *ngIf="f.amountPaid === 0" style="color:#999">-</span>
              </span>
              <span class="fee-action">
                <span *ngIf="f.status !== 'PAID' && f.status !== 'OVERPAID' && canEdit" class="pay-inline">
                  <span class="amount-field">CHF</span>
                  <input type="number" [(ngModel)]="f.payAmount" min="0.01" step="0.01" class="amount-input">
                  <button mat-raised-button color="primary"
                          class="pay-btn"
                          (click)="quickPay(f.year)"
                          [disabled]="f.loading || !f.payAmount || f.payAmount <= 0">
                    <mat-icon>check_circle</mat-icon> Bezahlt
                  </button>
                </span>
                <span *ngIf="(f.status === 'PAID' || f.status === 'OVERPAID') && !canEdit" class="paid-label">
                  <mat-icon style="color:#2e7d32;vertical-align:middle">check_circle</mat-icon> Bezahlt
                </span>
                <span *ngIf="(f.status === 'PAID' || f.status === 'OVERPAID') && canEdit" class="paid-with-undo">
                  <mat-icon style="color:#2e7d32;vertical-align:middle">check_circle</mat-icon>
                  <span style="color:#2e7d32;font-weight:500;margin-right:12px"> Bezahlt</span>
                  <button mat-stroked-button color="warn"
                          class="undo-btn"
                          (click)="undoPay(f.year)"
                          [disabled]="f.loading">
                    <mat-icon>undo</mat-icon> Rückgängig
                  </button>
                </span>
              </span>
            </div>
          </div>
          <p *ngIf="feeYears.length === 0">Keine Daten vorhanden.</p>
        </div>
      </mat-tab>
      <mat-tab label="Zahlungen">
        <div style="padding:16px">
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
          <p *ngIf="payments.length === 0">Keine Zahlungen vorhanden.</p>
        </div>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: [`
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .fee-grid { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
    .fee-row { display: grid; grid-template-columns: 80px 100px 100px 1fr; align-items: center; padding: 10px 16px; border-bottom: 1px solid #f0f0f0; }
    .fee-row:last-child { border-bottom: none; }
    .fee-header { background: #f5f5f5; font-weight: 600; font-size: 13px; color: #666; }
    .fee-paid { background: #f1f8e9; }
    .fee-year { font-size: 15px; }
    .fee-amount { font-size: 14px; }
    .fee-action { text-align: right; }
    .pay-inline { display: inline-flex; align-items: center; gap: 6px; }
    .amount-field { font-size: 13px; color: #666; }
    .amount-input { width: 80px; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; text-align: right; }
    .amount-input:focus { outline: none; border-color: #1976d2; }
    .pay-btn { font-size: 13px; }
    .paid-label { color: #2e7d32; font-weight: 500; font-size: 14px; }
    .paid-with-undo { display: inline-flex; align-items: center; }
    .undo-btn { font-size: 12px; }
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
    private auth: AuthService
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
    const ref = this.dialog.open(MemberFormDialogComponent, { width: '600px', data: this.member });
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
