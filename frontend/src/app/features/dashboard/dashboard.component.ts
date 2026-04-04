import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe, NgIf } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

interface Dashboard {
  totalMembers: number;
  activeMembers: number;
  paidThisYear: number;
  unpaidThisYear: number;
  totalCollectedThisYear: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatIconModule, NgIf, DecimalPipe],
  template: `
    <h2>Dashboard</h2>
    <div class="cards" *ngIf="data">
      <mat-card>
        <mat-card-content>
          <div class="card-inner">
            <mat-icon class="card-icon">people</mat-icon>
            <div>
              <div class="card-value">{{ data.activeMembers }}</div>
              <div class="card-label">Aktive Mitglieder</div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
      <mat-card>
        <mat-card-content>
          <div class="card-inner">
            <mat-icon class="card-icon" style="color:#4caf50">check_circle</mat-icon>
            <div>
              <div class="card-value">{{ data.paidThisYear }}</div>
              <div class="card-label">Bezahlt (dieses Jahr)</div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
      <mat-card>
        <mat-card-content>
          <div class="card-inner">
            <mat-icon class="card-icon" style="color:#f44336">warning</mat-icon>
            <div>
              <div class="card-value">{{ data.unpaidThisYear }}</div>
              <div class="card-label">Offen (dieses Jahr)</div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
      <mat-card>
        <mat-card-content>
          <div class="card-inner">
            <mat-icon class="card-icon" style="color:#2196f3">account_balance_wallet</mat-icon>
            <div>
              <div class="card-value">CHF {{ data.totalCollectedThisYear | number:'1.2-2' }}</div>
              <div class="card-label">Gesamteinnahmen</div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .card-inner { display: flex; align-items: center; gap: 16px; padding: 8px; }
    .card-icon { font-size: 40px; width: 40px; height: 40px; color: #1976d2; }
    .card-value { font-size: 28px; font-weight: 600; }
    .card-label { color: #666; font-size: 14px; }
  `]
})
export class DashboardComponent implements OnInit {
  data: Dashboard | null = null;
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.get<Dashboard>('/api/dashboard').subscribe(d => this.data = d);
  }
}
