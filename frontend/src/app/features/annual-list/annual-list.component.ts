import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-annual-list',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSortModule, NgFor, NgIf],
  template: `
    <div class="page-header">
      <h2>Jahresliste</h2>
      <div class="action-buttons">
        <mat-form-field appearance="outline" class="year-field">
          <mat-label>Von</mat-label>
          <input matInput type="number" [(ngModel)]="fromYear">
        </mat-form-field>
        <mat-form-field appearance="outline" class="year-field">
          <mat-label>Bis</mat-label>
          <input matInput type="number" [(ngModel)]="toYear">
        </mat-form-field>
        <button mat-raised-button (click)="load()"><mat-icon>refresh</mat-icon> Laden</button>
        <button mat-raised-button color="primary" (click)="downloadPdf()"><mat-icon>picture_as_pdf</mat-icon> PDF</button>
        <button mat-raised-button (click)="downloadCsv()"><mat-icon>description</mat-icon> CSV</button>
        <button mat-raised-button (click)="downloadExcel()"><mat-icon>table_chart</mat-icon> Excel</button>
      </div>
    </div>

    <mat-card>
      <mat-card-content>
        <mat-form-field appearance="outline" class="full-width" style="margin-bottom:8px">
          <mat-label>Suche (Name)</mat-label>
          <input matInput [(ngModel)]="searchTerm" (ngModelChange)="applyFilter()" placeholder="Suchen...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <div class="table-responsive">
          <table mat-table [dataSource]="dataSource" matSort *ngIf="dataSource.data.length > 0" class="full-width annual-table">
            <ng-container matColumnDef="nr"><th mat-header-cell *matHeaderCellDef mat-sort-header>NR.</th><td mat-cell *matCellDef="let r">{{ r.rowNumber }}</td></ng-container>
            <ng-container matColumnDef="lastName"><th mat-header-cell *matHeaderCellDef mat-sort-header>MBIEMRI</th><td mat-cell *matCellDef="let r">{{ r.lastName }}</td></ng-container>
            <ng-container matColumnDef="firstName"><th mat-header-cell *matHeaderCellDef mat-sort-header>EMRI</th><td mat-cell *matCellDef="let r">{{ r.firstName }}</td></ng-container>
            <ng-container *ngFor="let year of years" [matColumnDef]="'y'+year">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ year }}</th>
              <td mat-cell *matCellDef="let r" [class.status-paid]="r.yearlyPayments[year] >= 300"
                  [class.status-partial]="r.yearlyPayments[year] > 0 && r.yearlyPayments[year] < 300"
                  class="year-cell">
                {{ r.yearlyPayments[year] > 0 ? r.yearlyPayments[year] : '' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" (click)="goToMember(row)" class="clickable"></tr>
          </table>
        </div>
        <p *ngIf="dataSource.data.length === 0" class="empty-text">Keine Daten vorhanden.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .year-field { width: 90px; }
    .year-cell { text-align: center; }
    .clickable { cursor: pointer; }
    .empty-text { padding: 16px; text-align: center; color: #999; }
    .annual-table { font-size: 13px; }

    @media (max-width: 767px) {
      .year-field { width: 70px; }
      .annual-table { font-size: 11px; }
      .annual-table th, .annual-table td { padding: 4px 6px !important; }
    }
  `]
})
export class AnnualListComponent implements OnInit, AfterViewInit {
  fromYear = 2022;
  toYear = 2026;
  years: number[] = [];
  displayedColumns: string[] = [];
  searchTerm = '';
  dataSource = new MatTableDataSource<any>([]);

  @ViewChild(MatSort) sort!: MatSort;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() { this.load(); }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  load() {
    this.years = [];
    for (let y = this.fromYear; y <= this.toYear; y++) this.years.push(y);
    this.displayedColumns = ['nr', 'lastName', 'firstName', ...this.years.map(y => 'y' + y)];
    this.api.get<any[]>('/api/annual-list', { fromYear: this.fromYear, toYear: this.toYear }).subscribe(d => {
      this.dataSource.data = d;
      this.dataSource.sort = this.sort;
      this.dataSource.sortingDataAccessor = (item: any, property: string) => {
        if (property.startsWith('y')) {
          const year = parseInt(property.substring(1));
          return item.yearlyPayments[year] || 0;
        }
        return item[property] ?? '';
      };
      this.dataSource.filterPredicate = (data: any, filter: string) => {
        const search = filter.toLowerCase();
        return (data.lastName?.toLowerCase().includes(search) || false)
            || (data.firstName?.toLowerCase().includes(search) || false);
      };
    });
  }

  applyFilter() {
    this.dataSource.filter = this.searchTerm.trim();
  }

  goToMember(row: any) {
    this.router.navigate(['/members', row.memberId]);
  }

  downloadPdf() {
    this.api.downloadPdf(
      '/api/annual-list/pdf',
      `Jahresliste_${this.fromYear}-${this.toYear}.pdf`,
      { fromYear: this.fromYear, toYear: this.toYear }
    );
  }

  downloadCsv() {
    this.api.downloadFile(
      '/api/annual-list/csv',
      `Jahresliste_${this.fromYear}-${this.toYear}.csv`,
      { fromYear: this.fromYear, toYear: this.toYear }
    );
  }

  downloadExcel() {
    this.api.downloadFile(
      '/api/annual-list/excel',
      `Jahresliste_${this.fromYear}-${this.toYear}.xlsx`,
      { fromYear: this.fromYear, toYear: this.toYear }
    );
  }
}
