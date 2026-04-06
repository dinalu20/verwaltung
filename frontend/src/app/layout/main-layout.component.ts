import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver } from '@angular/cdk/layout';
import { AuthService } from '../core/services/auth.service';
import { NgIf } from '@angular/common';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule, MatButtonModule, NgIf],
  template: `
    <mat-sidenav-container class="app-container">
      <mat-sidenav #sidenav
        [mode]="isMobile ? 'over' : 'side'"
        [opened]="!isMobile"
        class="app-sidenav"
        [class.mobile-sidenav]="isMobile"
        [fixedInViewport]="isMobile"
      >
        <div class="sidenav-header">
          <mat-icon class="sidenav-logo">mosque</mat-icon>
          <h3>Moschee Verwaltung</h3>
        </div>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active" (click)="onNavClick()">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/members" routerLinkActive="active" (click)="onNavClick()">
            <mat-icon matListItemIcon>people</mat-icon>
            <span>Mitglieder</span>
          </a>
          <a mat-list-item routerLink="/payments" routerLinkActive="active" (click)="onNavClick()">
            <mat-icon matListItemIcon>payment</mat-icon>
            <span>Zahlung erfassen</span>
          </a>
          <a mat-list-item routerLink="/receipts" routerLinkActive="active" (click)="onNavClick()">
            <mat-icon matListItemIcon>receipt_long</mat-icon>
            <span>Quittungen</span>
          </a>
          <a mat-list-item routerLink="/cashbooks" routerLinkActive="active" (click)="onNavClick()">
            <mat-icon matListItemIcon>menu_book</mat-icon>
            <span>Kassenbuch</span>
          </a>
          <a mat-list-item routerLink="/annual-list" routerLinkActive="active" (click)="onNavClick()">
            <mat-icon matListItemIcon>list_alt</mat-icon>
            <span>Jahresliste</span>
          </a>
          <a mat-list-item routerLink="/bank-import" routerLinkActive="active" (click)="onNavClick()">
            <mat-icon matListItemIcon>account_balance</mat-icon>
            <span>Bankimport</span>
          </a>
          <a mat-list-item routerLink="/fee-import" routerLinkActive="active" (click)="onNavClick()">
            <mat-icon matListItemIcon>price_check</mat-icon>
            <span>Beitrags-Import</span>
          </a>
          <a mat-list-item routerLink="/members-import" routerLinkActive="active" (click)="onNavClick()">
            <mat-icon matListItemIcon>upload_file</mat-icon>
            <span>CSV Import</span>
          </a>
          <a mat-list-item routerLink="/users" routerLinkActive="active" (click)="onNavClick()" *ngIf="auth.hasRole('ADMIN')">
            <mat-icon matListItemIcon>admin_panel_settings</mat-icon>
            <span>Benutzer</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="app-content">
        <mat-toolbar class="app-toolbar">
          <button mat-icon-button *ngIf="isMobile" (click)="sidenav.toggle()" class="menu-btn">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="toolbar-title" *ngIf="isMobile">Moschee</span>
          <span class="toolbar-spacer"></span>
          <span class="user-info">{{ auth.currentUser?.fullName }}</span>
          <button mat-icon-button (click)="auth.logout()" aria-label="Abmelden">
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

    .app-sidenav {
      width: 260px;
      border-right: none;
      background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%);
      box-shadow: none;
    }
    .mobile-sidenav { width: 280px; }

    .sidenav-header {
      padding: 28px 16px 20px;
      text-align: center;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .sidenav-logo {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #5eead4;
      margin-bottom: 6px;
    }
    .sidenav-header h3 {
      margin: 4px 0 0;
      font-size: 14px;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    mat-nav-list {
      padding-top: 12px;
    }
    mat-nav-list a {
      margin: 2px 10px;
      border-radius: 10px;
      transition: background-color 0.2s, color 0.2s;
      color: #ffffff !important;
      --mdc-list-list-item-label-text-color: #cbd5e1 !important;
      --mdc-list-list-item-leading-icon-color: rgba(255,255,255,0.7) !important;
      font-weight: 500;
    }
    mat-nav-list a span,
    mat-nav-list a .mdc-list-item__primary-text,
    mat-nav-list a .mat-mdc-list-item-title,
    mat-nav-list a .mat-mdc-list-item-unscoped-content {
      color: #cbd5e1 !important;
    }
    mat-nav-list a mat-icon {
      color: rgba(255,255,255,0.7) !important;
    }
    mat-nav-list a:hover {
      background-color: rgba(255,255,255,0.08) !important;
      --mdc-list-list-item-label-text-color: #ffffff !important;
    }
    mat-nav-list a:hover span,
    mat-nav-list a:hover .mdc-list-item__primary-text {
      color: #ffffff !important;
    }
    mat-nav-list a:hover mat-icon {
      color: rgba(255,255,255,0.9) !important;
    }
    mat-nav-list a.active {
      background-color: rgba(255,255,255,0.12) !important;
      --mdc-list-list-item-label-text-color: #ffffff !important;
    }
    mat-nav-list a.active span,
    mat-nav-list a.active .mdc-list-item__primary-text {
      color: #ffffff !important;
    }
    mat-nav-list a.active mat-icon {
      color: #5eead4 !important;
    }

    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(240,244,248,0.82);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: var(--color-text, #1e293b);
      border-bottom: 1px solid rgba(0,0,0,0.06);
      box-shadow: none;
    }
    .toolbar-spacer { flex: 1; }
    .toolbar-title {
      font-size: 16px;
      font-weight: 600;
      margin-left: 4px;
      letter-spacing: -0.01em;
    }
    .user-info {
      font-size: 13px;
      margin-right: 8px;
      color: var(--color-text-secondary, #64748b);
      font-weight: 500;
    }
    .menu-btn { margin-right: 4px; }

    .content-wrapper {
      padding: var(--page-padding, 24px);
      min-height: calc(100vh - 64px);
    }

    @media (max-width: 767px) {
      .user-info { display: none; }
      .content-wrapper { padding: var(--page-padding, 16px); }
    }
  `]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  isMobile = false;
  @ViewChild('sidenav') sidenav!: MatSidenav;
  private subscriptions: Subscription[] = [];

  constructor(
    public auth: AuthService,
    private breakpointObserver: BreakpointObserver,
    private router: Router
  ) {}

  ngOnInit() {
    this.subscriptions.push(
      this.breakpointObserver.observe('(max-width: 767px)').subscribe(result => {
        this.isMobile = result.matches;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  onNavClick() {
    if (this.isMobile && this.sidenav) {
      this.sidenav.close();
    }
  }
}
