import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgFor, NgIf } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-annual-list',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, NgFor, NgIf],
  template: `
    <div class="page-header">
      <h2>Jahresliste (LISTA E ANTARËSISË)</h2>
      <div>
        <mat-form-field appearance="outline" style="width:100px;margin-right:8px">
          <mat-label>Von</mat-label>
          <input matInput type="number" [(ngModel)]="fromYear">
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100px;margin-right:8px">
          <mat-label>Bis</mat-label>
          <input matInput type="number" [(ngModel)]="toYear">
        </mat-form-field>
        <button mat-raised-button (click)="load()"><mat-icon>refresh</mat-icon> Laden</button>
        <button mat-raised-button color="primary" (click)="downloadPdf()" style="margin-left:8px"><mat-icon>picture_as_pdf</mat-icon> PDF (A3)</button>
      </div>
    </div>

    <mat-card>
      <mat-card-content style="overflow-x:auto">
        <table mat-table [dataSource]="rows" *ngIf="rows.length > 0" class="full-width">
          <ng-container matColumnDef="nr"><th mat-header-cell *matHeaderCellDef>NR.</th><td mat-cell *matCellDef="let r">{{ r.rowNumber }}</td></ng-container>
          <ng-container matColumnDef="lastName"><th mat-header-cell *matHeaderCellDef>MBIEMRI</th><td mat-cell *matCellDef="let r">{{ r.lastName }}</td></ng-container>
          <ng-container matColumnDef="firstName"><th mat-header-cell *matHeaderCellDef>EMRI</th><td mat-cell *matCellDef="let r">{{ r.firstName }}</td></ng-container>
          <ng-container *ngFor="let year of years" [matColumnDef]="'y'+year">
            <th mat-header-cell *matHeaderCellDef>{{ year }}</th>
            <td mat-cell *matCellDef="let r" [class.status-paid]="r.yearlyPayments[year] >= 300"
                [class.status-partial]="r.yearlyPayments[year] > 0 && r.yearlyPayments[year] < 300"
                style="text-align:center">
              {{ r.yearlyPayments[year] > 0 ? r.yearlyPayments[year] : '' }}
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
        <p *ngIf="rows.length === 0">Keine Daten vorhanden.</p>
      </mat-card-content>
    </mat-card>
  `
})
export class AnnualListComponent implements OnInit {
  fromYear = 2022;
  toYear = 2026;
  rows: any[] = [];
  years: number[] = [];
  displayedColumns: string[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.years = [];
    for (let y = this.fromYear; y <= this.toYear; y++) this.years.push(y);
    this.displayedColumns = ['nr', 'lastName', 'firstName', ...this.years.map(y => 'y' + y)];
    this.api.get<any[]>('/api/annual-list', { fromYear: this.fromYear, toYear: this.toYear }).subscribe(d => this.rows = d);
  }

  downloadPdf() {
    this.api.downloadPdf(
      '/api/annual-list/pdf',
      `Jahresliste_${this.fromYear}-${this.toYear}.pdf`,
      { fromYear: this.fromYear, toYear: this.toYear }
    );
  }
}
