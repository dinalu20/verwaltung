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
      <mat-card class="stat-card accent-blue">
        <mat-card-content>
          <div class="card-inner">
            <div class="card-icon-wrap blue">
              <mat-icon>people</mat-icon>
            </div>
            <div class="card-text">
              <div class="card-value">{{ data.activeMembers }}</div>
              <div class="card-label">Aktive Mitglieder</div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
      <mat-card class="stat-card accent-green">
        <mat-card-content>
          <div class="card-inner">
            <div class="card-icon-wrap green">
              <mat-icon>check_circle</mat-icon>
            </div>
            <div class="card-text">
              <div class="card-value">{{ data.paidThisYear }}</div>
              <div class="card-label">Bezahlt dieses Jahr</div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
      <mat-card class="stat-card accent-red">
        <mat-card-content>
          <div class="card-inner">
            <div class="card-icon-wrap red">
              <mat-icon>warning</mat-icon>
            </div>
            <div class="card-text">
              <div class="card-value">{{ data.unpaidThisYear }}</div>
              <div class="card-label">Offen dieses Jahr</div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
      <mat-card class="stat-card accent-teal">
        <mat-card-content>
          <div class="card-inner">
            <div class="card-icon-wrap teal">
              <mat-icon>account_balance_wallet</mat-icon>
            </div>
            <div class="card-text">
              <div class="card-value">CHF {{ data.totalCollectedThisYear | number:'1.2-2' }}</div>
              <div class="card-label">Gesamteinnahmen</div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .stat-card {
      border-left: 4px solid transparent !important;
      overflow: hidden;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important;
    }
    .accent-blue { border-left-color: #0891b2 !important; }
    .accent-green { border-left-color: #059669 !important; }
    .accent-red { border-left-color: #dc2626 !important; }
    .accent-teal { border-left-color: #0d9488 !important; }

    .card-inner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 4px;
    }
    .card-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .card-icon-wrap mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
      color: #fff;
    }
    .card-icon-wrap.blue { background: linear-gradient(135deg, #0891b2, #22d3ee); }
    .card-icon-wrap.green { background: linear-gradient(135deg, #059669, #34d399); }
    .card-icon-wrap.red { background: linear-gradient(135deg, #dc2626, #f87171); }
    .card-icon-wrap.teal { background: linear-gradient(135deg, #0d9488, #5eead4); }

    .card-value {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.02em;
      color: var(--color-text, #1e293b);
    }
    .card-label {
      color: var(--color-text-secondary, #64748b);
      font-size: 12px;
      font-weight: 500;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    @media (max-width: 767px) {
      .cards { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .card-inner { gap: 10px; padding: 4px 0; }
      .card-icon-wrap { width: 42px; height: 42px; border-radius: 12px; }
      .card-icon-wrap mat-icon { font-size: 22px; width: 22px; height: 22px; }
      .card-value { font-size: 22px; }
      .card-label { font-size: 10px; }
    }

    @media (max-width: 374px) {
      .cards { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  data: Dashboard | null = null;
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.get<Dashboard>('/api/dashboard').subscribe(d => this.data = d);
  }
}
