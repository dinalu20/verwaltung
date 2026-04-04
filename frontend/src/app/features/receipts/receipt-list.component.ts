import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-receipt-list',
  standalone: true,
  imports: [MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatPaginatorModule, NgIf, RouterLink],
  template: `
    <div class="page-header">
      <h2>Quittungen</h2>
    </div>

    <mat-card>
      <mat-card-content>
        <table mat-table [dataSource]="receipts" *ngIf="receipts.length > 0" class="full-width">
          <ng-container matColumnDef="receiptNumber">
            <th mat-header-cell *matHeaderCellDef>Nr.</th>
            <td mat-cell *matCellDef="let r"><strong>{{ r.receiptNumber }}</strong></td>
          </ng-container>
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Datum</th>
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
            <th mat-header-cell *matHeaderCellDef>Betrag</th>
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
            <th mat-header-cell *matHeaderCellDef>Aktionen</th>
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
        <p *ngIf="receipts.length === 0" style="padding:16px;text-align:center;color:#999">Keine Quittungen vorhanden.</p>
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
    .full-width { width: 100%; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  `]
})
export class ReceiptListComponent implements OnInit {
  receipts: any[] = [];
  columns = ['receiptNumber', 'date', 'member', 'amount', 'purpose', 'type', 'actions'];
  page = 0;
  pageSize = 50;
  totalElements = 0;
  canEdit = false;

  constructor(
    private api: ApiService,
    private notify: NotificationService,
    private auth: AuthService
  ) {
    this.canEdit = auth.hasRole('ADMIN', 'KASSIER');
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<any>('/api/receipts', { page: this.page, size: this.pageSize, sort: 'createdAt,desc' }).subscribe(res => {
      this.receipts = res.content || [];
      this.totalElements = res.totalElements || 0;
    });
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
