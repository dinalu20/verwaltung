import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIf, NgClass } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-bank-import-detail',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatTooltipModule, NgIf, NgClass],
  template: `
    <div class="page-header" *ngIf="importData">
      <h2>Bankimport: {{ importData.fileName }}</h2>
      <div class="action-buttons">
        <button mat-raised-button color="primary" (click)="confirmAll()"><mat-icon>done_all</mat-icon> Alle >90% bestätigen</button>
      </div>
    </div>

    <mat-card *ngIf="importData">
      <mat-card-content>
        <div class="table-responsive">
          <table mat-table [dataSource]="importData.lines || []" class="full-width">
            <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Datum</th><td mat-cell *matCellDef="let l">{{ l.bookingDate }}</td></ng-container>
            <ng-container matColumnDef="text"><th mat-header-cell *matHeaderCellDef>Buchungstext</th><td mat-cell *matCellDef="let l" class="text-cell">{{ l.bookingText }}</td></ng-container>
            <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Betrag</th><td mat-cell *matCellDef="let l">CHF {{ l.amount }}</td></ng-container>
            <ng-container matColumnDef="match"><th mat-header-cell *matHeaderCellDef>Vorschlag</th><td mat-cell *matCellDef="let l">
              <span *ngIf="l.suggestedMemberName">{{ l.suggestedMemberName }}</span>
              <span *ngIf="!l.suggestedMemberName" class="muted">-</span>
            </td></ng-container>
            <ng-container matColumnDef="confidence"><th mat-header-cell *matHeaderCellDef>Konfidenz</th><td mat-cell *matCellDef="let l">
              <span class="status-badge" [ngClass]="{'status-high': l.matchConfidence >= 80, 'status-medium': l.matchConfidence >= 50 && l.matchConfidence < 80, 'status-low': l.matchConfidence < 50}">
                {{ l.matchConfidence || 0 }}%
              </span>
            </td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let l">
              <span class="status-badge" [ngClass]="{'status-paid': l.matchStatus === 'CONFIRMED', 'status-open': l.matchStatus === 'REJECTED', 'status-partial': l.matchStatus === 'PENDING'}">
                {{ l.matchStatus }}
              </span>
            </td></ng-container>
            <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let l">
              <span *ngIf="l.matchStatus === 'PENDING'">
                <button mat-icon-button color="primary" (click)="confirm(l, true)" matTooltip="Bestätigen"><mat-icon>check</mat-icon></button>
                <button mat-icon-button color="warn" (click)="confirm(l, false)" matTooltip="Ablehnen"><mat-icon>close</mat-icon></button>
              </span>
            </td></ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .text-cell { max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .muted { color: #999; }

    @media (max-width: 767px) {
      .text-cell { max-width: 150px; font-size: 12px; }
    }
  `]
})
export class BankImportDetailComponent implements OnInit {
  importData: any = null;
  columns = ['date', 'text', 'amount', 'match', 'confidence', 'status', 'actions'];

  constructor(private route: ActivatedRoute, private api: ApiService, private notify: NotificationService) {}

  ngOnInit() { this.load(); }

  load() {
    const id = this.route.snapshot.paramMap.get('id');
    this.api.get<any>(`/api/bank-imports/${id}`).subscribe(d => this.importData = d);
  }

  confirm(line: any, isConfirm: boolean) {
    this.api.post('/api/bank-imports/confirm', {
      lineId: line.id, memberId: line.suggestedMemberId, confirm: isConfirm, forYear: new Date().getFullYear()
    }).subscribe(() => { this.notify.success(isConfirm ? 'Bestätigt' : 'Abgelehnt'); this.load(); });
  }

  confirmAll() {
    this.api.post(`/api/bank-imports/${this.importData.id}/confirm-all`, {}).subscribe(() => {
      this.notify.success('Alle hoch-konfidenten Einträge bestätigt');
      this.load();
    });
  }
}
