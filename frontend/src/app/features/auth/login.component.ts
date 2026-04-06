import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, NgIf],
  template: `
    <div class="login-container">
      <div class="deco deco-1"></div>
      <div class="deco deco-2"></div>
      <div class="deco deco-3"></div>
      <mat-card class="login-card">
        <mat-card-content>
          <div class="login-header">
            <div class="logo-wrap">
              <mat-icon class="login-logo">mosque</mat-icon>
            </div>
            <h2>Moschee Verwaltung</h2>
            <p>Bitte melden Sie sich an</p>
          </div>
          <form (ngSubmit)="onLogin()" class="login-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Benutzername</mat-label>
              <input matInput [(ngModel)]="username" name="username" required autofocus>
              <mat-icon matPrefix>person</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Passwort</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'" [(ngModel)]="password" name="password" required>
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <p class="error-message" *ngIf="error">{{ error }}</p>

            <button mat-raised-button color="primary" type="submit" class="full-width login-button" [disabled]="loading">
              {{ loading ? 'Anmeldung...' : 'Anmelden' }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #0f766e 0%, #134e4a 40%, #1a2332 100%);
      padding: 16px;
      position: relative;
      overflow: hidden;
    }

    .deco {
      position: absolute;
      border-radius: 50%;
      opacity: 0.07;
      background: #fff;
    }
    .deco-1 { width: 400px; height: 400px; top: -120px; right: -100px; }
    .deco-2 { width: 300px; height: 300px; bottom: -80px; left: -80px; }
    .deco-3 { width: 180px; height: 180px; bottom: 20%; right: 10%; opacity: 0.04; }

    .login-card {
      max-width: 420px;
      width: 100%;
      padding: 40px 32px;
      border-radius: 20px !important;
      background: rgba(255,255,255,0.92) !important;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      box-shadow: 0 8px 40px rgba(0,0,0,0.15) !important;
      border: 1px solid rgba(255,255,255,0.3) !important;
      position: relative;
      z-index: 1;
    }
    .login-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .logo-wrap {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      background: linear-gradient(135deg, #0d9488, #5eead4);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 4px 20px rgba(13,148,136,0.3);
    }
    .login-logo {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #fff;
    }
    .login-header h2 {
      margin: 0 0 4px;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #1e293b;
    }
    .login-header p {
      margin: 0;
      color: #64748b;
      font-size: 14px;
    }
    .login-form {
      display: flex;
      flex-direction: column;
    }
    .full-width { width: 100%; }
    .login-button {
      height: 48px;
      font-size: 15px;
      font-weight: 600;
      margin-top: 8px;
      border-radius: 12px !important;
      background: linear-gradient(135deg, #0d9488, #0f766e) !important;
      box-shadow: 0 4px 14px rgba(13,148,136,0.3) !important;
      letter-spacing: 0.02em;
    }
    .login-button:hover {
      box-shadow: 0 6px 20px rgba(13,148,136,0.4) !important;
    }
    .error-message {
      color: #dc2626;
      text-align: center;
      margin: 8px 0;
      font-size: 14px;
      font-weight: 500;
    }

    @media (max-width: 767px) {
      .login-card { padding: 28px 20px; }
      .logo-wrap { width: 60px; height: 60px; border-radius: 16px; }
      .login-logo { font-size: 30px; width: 30px; height: 30px; }
      .login-header h2 { font-size: 22px; }
    }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';
  loading = false;
  hidePassword = true;

  constructor(private authService: AuthService, private router: Router) {
    if (authService.isLoggedIn) {
      router.navigate(['/']);
    }
  }

  onLogin(): void {
    this.loading = true;
    this.error = '';
    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error = 'Ungültiger Benutzername oder Passwort';
        this.loading = false;
      }
    });
  }
}
