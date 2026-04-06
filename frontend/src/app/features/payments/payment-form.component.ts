import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NgIf, NgFor } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatAutocompleteModule, MatCheckboxModule, NgIf, NgFor],
  template: `
    <h2>Zahlung erfassen / Quittung erstellen</h2>
    <mat-card class="payment-card">
      <mat-card-content>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Mitglied suchen (optional)</mat-label>
          <input matInput [(ngModel)]="memberSearch" (ngModelChange)="searchMembers()" [matAutocomplete]="auto">
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="selectMember($event)">
            <mat-option *ngFor="let m of filteredMembers" [value]="m.lastName + ' ' + m.firstName" [id]="m.id">
              {{ m.lastName }} {{ m.firstName }} - {{ m.city }}
            </mat-option>
          </mat-autocomplete>
        </mat-form-field>
        <p *ngIf="selectedMember" class="selected-member">
          Gewählt: <strong>{{ selectedMember.lastName }} {{ selectedMember.firstName }}</strong>
          <button mat-icon-button (click)="clearMember()"><mat-icon>close</mat-icon></button>
        </p>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Betrag (CHF)</mat-label>
            <input matInput type="number" [(ngModel)]="payment.amount" min="0.01" step="0.01" required>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Jahr</mat-label>
            <input matInput type="number" [(ngModel)]="payment.forYear">
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Zahlungsart</mat-label>
            <mat-select [(ngModel)]="payment.paymentType" required>
              <mat-option value="CASH">Bar</mat-option>
              <mat-option value="BANK">Bank</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Zweck</mat-label>
            <mat-select [(ngModel)]="payment.purpose" required>
              <mat-option value="MEMBERSHIP_FEE">Mitgliedsbeitrag</mat-option>
              <mat-option value="ZAKAT">Zakat</mat-option>
              <mat-option value="FITRA">Fitra</mat-option>
              <mat-option value="DONATION">Spende</mat-option>
              <mat-option value="OTHER">Sonstiges</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width" *ngIf="payment.purpose === 'OTHER'">
          <mat-label>Freitext Zweck</mat-label>
          <input matInput [(ngModel)]="payment.purposeText">
        </mat-form-field>

        <mat-checkbox [(ngModel)]="payment.addToCashBook" class="cashbook-check">
          Ins Kassenbuch übernehmen
        </mat-checkbox>

        <mat-form-field appearance="outline" class="full-width" *ngIf="payment.addToCashBook && openCashBooks.length > 0">
          <mat-label>Kassenbuch</mat-label>
          <mat-select [(ngModel)]="payment.cashBookId">
            <mat-option *ngFor="let cb of openCashBooks" [value]="cb.id">
              {{ cb.name }} ({{ cb.periodYear }})
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div>
          <button mat-raised-button color="primary" (click)="submit()" [disabled]="saving || !payment.amount || !payment.purpose" class="submit-btn">
            <mat-icon>receipt</mat-icon> Zahlung erfassen & Quittung erstellen
          </button>
        </div>

        <mat-card *ngIf="lastPayment" class="success-card">
          <mat-card-content>
            <h3 class="success-title">Zahlung erfasst!</h3>
            <p>Quittung Nr: <strong>{{ lastPayment.receiptNumber }}</strong></p>
            <p>Betrag: <strong>CHF {{ lastPayment.amount }}</strong></p>
            <div class="success-actions">
              <button mat-raised-button (click)="printReceipt(lastPayment.receiptId)">
                <mat-icon>print</mat-icon> Quittung drucken
              </button>
              <button mat-raised-button color="accent" (click)="downloadReceipt(lastPayment.receiptId, lastPayment.receiptNumber)">
                <mat-icon>download</mat-icon> PDF herunterladen
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .payment-card {
      max-width: 700px;
      border-radius: var(--card-radius, 12px) !important;
    }
    .selected-member {
      margin: -8px 0 12px;
      color: var(--color-primary, #00796b);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .cashbook-check { display: block; margin-bottom: 16px; }
    .submit-btn { margin-top: 8px; }
    .success-card {
      margin-top: 24px;
      background: #e8f5e9 !important;
      border-radius: var(--card-radius, 12px) !important;
    }
    .success-title { color: #2e7d32; margin-top: 0; }
    .success-actions { display: flex; gap: 8px; flex-wrap: wrap; }

    @media (max-width: 767px) {
      .payment-card { max-width: 100%; }
    }
  `]
})
export class PaymentFormComponent implements OnInit {
  payment: any = { amount: 300, paymentType: 'CASH', purpose: 'MEMBERSHIP_FEE', addToCashBook: true, forYear: new Date().getFullYear(), cashBookId: null };
  memberSearch = '';
  filteredMembers: any[] = [];
  selectedMember: any = null;
  openCashBooks: any[] = [];
  saving = false;
  lastPayment: any = null;

  constructor(private api: ApiService, private notify: NotificationService) {}

  ngOnInit() {
    this.loadOpenCashBooks();
  }

  loadOpenCashBooks() {
    this.api.get<any[]>('/api/cashbooks').subscribe(books => {
      this.openCashBooks = (books || []).filter((b: any) => b.status === 'OPEN');
      if (this.openCashBooks.length > 0 && !this.payment.cashBookId) {
        this.payment.cashBookId = this.openCashBooks[0].id;
      }
    });
  }

  searchMembers() {
    if (this.memberSearch.length < 2) { this.filteredMembers = []; return; }
    this.api.get<any>('/api/members', { search: this.memberSearch, size: 10 }).subscribe(res => {
      this.filteredMembers = res.content || [];
    });
  }

  selectMember(event: any) {
    const name = event.option.value;
    this.selectedMember = this.filteredMembers.find(m => (m.lastName + ' ' + m.firstName) === name);
    this.payment.memberId = this.selectedMember?.id;
  }

  clearMember() {
    this.selectedMember = null;
    this.payment.memberId = null;
    this.memberSearch = '';
  }

  submit() {
    this.saving = true;
    this.api.post<any>('/api/payments', this.payment).subscribe({
      next: (res) => {
        this.lastPayment = res;
        this.notify.success('Zahlung erfasst');
        this.saving = false;
      },
      error: (err) => {
        this.notify.error('Fehler: ' + (err.error?.message || 'Unbekannt'));
        this.saving = false;
      }
    });
  }

  printReceipt(receiptId: number) {
    this.api.openPdf(`/api/receipts/${receiptId}/pdf`);
  }

  downloadReceipt(receiptId: number, receiptNumber: string) {
    this.api.downloadPdf(`/api/receipts/${receiptId}/pdf`, `Quittung_${receiptNumber}.pdf`);
  }
}
