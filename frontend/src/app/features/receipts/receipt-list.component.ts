import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-receipt-list',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatPaginatorModule,
    MatSortModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule, NgIf, RouterLink],
  template: `
    <div class="page-header">
      <h2>Quittungen</h2>
    </div>

    <mat-card class="filter-card">
      <mat-card-content>
        <div class="filter-row">
          <mat-form-field appearance="outline">
            <mat-label>Suche (Name / Nr.)</mat-label>
            <input matInput [(ngModel)]="search" (keyup.enter)="applyFilters()">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Datum von</mat-label>
            <input matInput type="date" [(ngModel)]="dateFrom">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Datum bis</mat-label>
            <input matInput type="date" [(ngModel)]="dateTo">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Zweck</mat-label>
            <mat-select [(ngModel)]="purpose">
              <mat-option value="">Alle</mat-option>
              <mat-option value="MEMBERSHIP_FEE">Mitgliedsbeitrag</mat-option>
              <mat-option value="ZAKAT">Zakat</mat-option>
              <mat-option value="FITRA">Fitra</mat-option>
              <mat-option value="DONATION">Spende</mat-option>
              <mat-option value="OTHER">Sonstiges</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Zahlungsart</mat-label>
            <mat-select [(ngModel)]="paymentType">
              <mat-option value="">Alle</mat-option>
              <mat-option value="CASH">Bar</mat-option>
              <mat-option value="BANK">Bank</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="filter-actions">
          <button mat-raised-button color="primary" (click)="applyFilters()">
            <mat-icon>filter_list</mat-icon> Filtern
          </button>
          <button mat-button (click)="resetFilters()">
            <mat-icon>clear</mat-icon> Zurücksetzen
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    <mat-card>
      <mat-card-content>
        <div class="table-responsive">
          <table mat-table [dataSource]="receipts" matSort (matSortChange)="onSort($event)" *ngIf="receipts.length > 0" class="full-width">
            <ng-container matColumnDef="receiptNumber">
              <th mat-header-cell *matHeaderCellDef mat-sort-header="receiptNumber">Nr.</th>
              <td mat-cell *matCellDef="let r"><strong>{{ r.receiptNumber }}</strong></td>
            </ng-container>
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef mat-sort-header="receiptDate">Datum</th>
              <td mat-cell *matCellDef="let r">{{ r.receiptDate }}</td>
            </ng-container>
            <ng-container matColumnDef="member">
              <th mat-header-cell *matHeaderCellDef>Mitglied</th>
              <td mat-cell *matCellDef="let r">
                <a *ngIf="r.memberId" [routerLink]="['/members', r.memberId]">{{ r.memberName }}</a>
                <span *ngIf="!r.memberId">-</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef mat-sort-header="amount">Betrag</th>
              <td mat-cell *matCellDef="let r">CHF {{ r.amount }}</td>
            </ng-container>
            <ng-container matColumnDef="purpose">
              <th mat-header-cell *matHeaderCellDef>Zweck</th>
              <td mat-cell *matCellDef="let r">{{ purposeLabel(r.purpose, r.purposeText) }}</td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Art</th>
              <td mat-cell *matCellDef="let r">{{ r.paymentType === 'CASH' ? 'Bar' : 'Bank' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let r">
                <button mat-icon-button (click)="openPdf(r.id)" matTooltip="Anzeigen">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button (click)="downloadPdf(r.id, r.receiptNumber)" matTooltip="Herunterladen">
                  <mat-icon>download</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteReceipt(r)" *ngIf="canEdit" matTooltip="Löschen">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        </div>
        <p *ngIf="receipts.length === 0" class="empty-text">Keine Quittungen vorhanden.</p>
        <mat-paginator
          [length]="totalElements"
          [pageSize]="pageSize"
          [pageIndex]="page"
          [pageSizeOptions]="[25, 50, 100]"
          (page)="onPage($event)"
          showFirstLastButtons>
        </mat-paginator>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .filter-card { margin-bottom: 16px; }
    .filter-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: flex-start;
    }
    .filter-row mat-form-field { flex: 1; min-width: 150px; }
    .filter-actions { display: flex; gap: 8px; margin-top: 4px; }
    .empty-text { padding: 16px; text-align: center; color: #999; }

    @media (max-width: 767px) {
      .filter-row { flex-direction: column; gap: 0; }
      .filter-row mat-form-field { min-width: 100%; }
      .filter-actions { flex-direction: row; }
    }
  `]
})
export class ReceiptListComponent implements OnInit, OnDestroy {
  receipts: any[] = [];
  columns = ['receiptNumber', 'date', 'member', 'amount', 'purpose', 'type', 'actions'];
  page = 0;
  pageSize = 50;
  totalElements = 0;
  canEdit = false;

  search = '';
  dateFrom = '';
  dateTo = '';
  purpose = '';
  paymentType = '';
  sortField = 'createdAt';
  sortDirection = 'desc';
  private subs: Subscription[] = [];

  constructor(
    private api: ApiService,
    private notify: NotificationService,
    private auth: AuthService,
    private breakpointObserver: BreakpointObserver
  ) {
    this.canEdit = auth.hasRole('ADMIN', 'KASSIER');
  }

  ngOnInit() {
    this.subs.push(
      this.breakpointObserver.observe('(max-width: 767px)').subscribe(result => {
        this.columns = result.matches
          ? ['receiptNumber', 'member', 'amount', 'actions']
          : ['receiptNumber', 'date', 'member', 'amount', 'purpose', 'type', 'actions'];
      })
    );
    this.load();
  }

  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }

  load() {
    const params: any = {
      page: this.page,
      size: this.pageSize,
      sort: `${this.sortField},${this.sortDirection}`
    };
    if (this.search) params.search = this.search;
    if (this.dateFrom) params.dateFrom = this.dateFrom;
    if (this.dateTo) params.dateTo = this.dateTo;
    if (this.purpose) params.purpose = this.purpose;
    if (this.paymentType) params.paymentType = this.paymentType;

    this.api.get<any>('/api/receipts', params).subscribe(res => {
      this.receipts = res.content || [];
      this.totalElements = res.totalElements || 0;
    });
  }

  applyFilters() {
    this.page = 0;
    this.load();
  }

  resetFilters() {
    this.search = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.purpose = '';
    this.paymentType = '';
    this.page = 0;
    this.sortField = 'createdAt';
    this.sortDirection = 'desc';
    this.load();
  }

  onSort(sort: Sort) {
    this.sortField = sort.active || 'createdAt';
    this.sortDirection = sort.direction || 'desc';
    this.page = 0;
    this.load();
  }

  onPage(event: PageEvent) {
    this.page = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  purposeLabel(purpose: string, purposeText: string): string {
    const labels: Record<string, string> = {
      MEMBERSHIP_FEE: 'Mitgliedsbeitrag', ZAKAT: 'Zakat', FITRA: 'Fitra',
      DONATION: 'Spende', OTHER: purposeText || 'Sonstiges'
    };
    return labels[purpose] || purpose;
  }

  openPdf(id: number) {
    this.api.openPdf(`/api/receipts/${id}/pdf`);
  }

  downloadPdf(id: number, receiptNumber: string) {
    this.api.downloadPdf(`/api/receipts/${id}/pdf`, `Quittung_${receiptNumber}.pdf`);
  }

  deleteReceipt(receipt: any) {
    if (confirm(`Quittung ${receipt.receiptNumber} wirklich löschen?`)) {
      this.api.delete(`/api/receipts/${receipt.id}`).subscribe({
        next: () => {
          this.notify.success('Quittung gelöscht');
          this.load();
        },
        error: (err) => {
          this.notify.error('Fehler: ' + (err.error?.message || 'Unbekannt'));
        }
      });
    }
  }
}
