import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../core/services/auth.service';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule, MatButtonModule, NgIf],
  template: `
    <mat-sidenav-container class="app-container">
      <mat-sidenav mode="side" opened class="app-sidenav">
        <div class="sidenav-header">
          <h3>Moschee Verwaltung</h3>
        </div>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/members" routerLinkActive="active">
            <mat-icon matListItemIcon>people</mat-icon>
            <span>Mitglieder</span>
          </a>
          <a mat-list-item routerLink="/payments" routerLinkActive="active">
            <mat-icon matListItemIcon>payment</mat-icon>
            <span>Zahlung erfassen</span>
          </a>
          <a mat-list-item routerLink="/receipts" routerLinkActive="active">
            <mat-icon matListItemIcon>receipt_long</mat-icon>
            <span>Quittungen</span>
          </a>
          <a mat-list-item routerLink="/cashbooks" routerLinkActive="active">
            <mat-icon matListItemIcon>menu_book</mat-icon>
            <span>Kassenbuch</span>
          </a>
          <a mat-list-item routerLink="/annual-list" routerLinkActive="active">
            <mat-icon matListItemIcon>list_alt</mat-icon>
            <span>Jahresliste</span>
          </a>
          <a mat-list-item routerLink="/bank-import" routerLinkActive="active">
            <mat-icon matListItemIcon>account_balance</mat-icon>
            <span>Bankimport</span>
          </a>
          <a mat-list-item routerLink="/members-import" routerLinkActive="active">
            <mat-icon matListItemIcon>upload_file</mat-icon>
            <span>CSV Import</span>
          </a>
          <a mat-list-item routerLink="/users" routerLinkActive="active" *ngIf="auth.hasRole('ADMIN')">
            <mat-icon matListItemIcon>admin_panel_settings</mat-icon>
            <span>Benutzer</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="app-content">
        <mat-toolbar color="primary" class="app-toolbar">
          <span class="toolbar-spacer"></span>
          <span class="user-info">{{ auth.currentUser?.fullName }} ({{ auth.currentUser?.role }})</span>
          <button mat-icon-button (click)="auth.logout()" matTooltip="Abmelden">
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>
        <div class="content-wrapper">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-container { height: 100vh; }
    .app-sidenav { width: 240px; }
    .sidenav-header { padding: 16px; text-align: center; border-bottom: 1px solid #e0e0e0; }
    .sidenav-header h3 { margin: 0; font-size: 16px; }
    .app-toolbar { position: sticky; top: 0; z-index: 10; }
    .toolbar-spacer { flex: 1; }
    .user-info { font-size: 14px; margin-right: 8px; }
    .content-wrapper { padding: 24px; }
    .active { background-color: rgba(0, 0, 0, 0.04); }
    mat-nav-list a { margin: 2px 8px; border-radius: 8px; }
  `]
})
export class MainLayoutComponent {
  constructor(public auth: AuthService) {}
}
