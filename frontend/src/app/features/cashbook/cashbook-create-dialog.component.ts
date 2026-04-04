import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { NgFor } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

@Component({
  selector: 'app-cashbook-create-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, NgFor],
  template: `
    <h2 mat-dialog-title>Neues Kassenbuch</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Name</mat-label>
        <input matInput [(ngModel)]="book.name" required>
      </mat-form-field>
      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>Typ</mat-label>
          <mat-select [(ngModel)]="book.bookType" required>
            <mat-option value="GENERAL">Allgemein</mat-option>
            <mat-option value="RAMADAN">Ramadan</mat-option>
            <mat-option value="CUSTOM">Benutzerdefiniert</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Jahr</mat-label>
          <input matInput type="number" [(ngModel)]="book.periodYear" (ngModelChange)="updateName()" required>
        </mat-form-field>
      </div>
      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>Monat</mat-label>
          <mat-select [(ngModel)]="book.periodMonth" (ngModelChange)="updateName()">
            <mat-option [value]="null">-- Kein Monat --</mat-option>
            <mat-option *ngFor="let m of months; let i = index" [value]="i + 1">{{ m }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Eröffnungssaldo (CHF)</mat-label>
          <input matInput type="number" [(ngModel)]="book.openingBalance" step="0.01">
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Abbrechen</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!book.name || !book.bookType || !book.periodYear">Erstellen</button>
    </mat-dialog-actions>
  `
})
export class CashBookCreateDialogComponent implements OnInit {
  months = MONTH_NAMES;
  book: any;

  constructor(
    private dialogRef: MatDialogRef<CashBookCreateDialogComponent>,
    private api: ApiService
  ) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    this.book = {
      bookType: 'GENERAL',
      periodYear: year,
      periodMonth: month,
      openingBalance: 0,
      name: 'Kassenbuch ' + MONTH_NAMES[month - 1] + ' ' + year
    };
  }

  ngOnInit() {
    this.api.get<any>('/api/cashbooks/last-balance').subscribe({
      next: (res) => {
        if (res && res.balance != null) {
          this.book.openingBalance = res.balance;
        }
      },
      error: () => {}
    });
  }

  updateName() {
    if (this.book.periodMonth && this.book.periodYear) {
      this.book.name = 'Kassenbuch ' + MONTH_NAMES[this.book.periodMonth - 1] + ' ' + this.book.periodYear;
    } else if (this.book.periodYear) {
      this.book.name = 'Kassenbuch ' + this.book.periodYear;
    }
  }

  save() { this.dialogRef.close(this.book); }
}
