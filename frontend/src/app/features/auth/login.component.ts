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
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Moschee Verwaltung</mat-card-title>
          <mat-card-subtitle>Bitte melden Sie sich an</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
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
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; background: #f5f5f5;
    }
    .login-card { max-width: 400px; width: 100%; padding: 24px; }
    .login-form { display: flex; flex-direction: column; margin-top: 16px; }
    .full-width { width: 100%; }
    .login-button { height: 48px; font-size: 16px; margin-top: 8px; }
    .error-message { color: #f44336; text-align: center; margin: 8px 0; }
    mat-card-header { justify-content: center; margin-bottom: 16px; }
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
