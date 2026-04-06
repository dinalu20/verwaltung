import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NgIf } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Benutzer</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Benutzername</mat-label>
        <input matInput [(ngModel)]="user.username" required>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Vollständiger Name</mat-label>
        <input matInput [(ngModel)]="user.fullName" required>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Passwort</mat-label>
        <input matInput type="password" [(ngModel)]="user.password">
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Rolle</mat-label>
        <mat-select [(ngModel)]="user.role" required>
          <mat-option value="ADMIN">Admin</mat-option>
          <mat-option value="KASSIER">Kassier</mat-option>
          <mat-option value="VORSTAND">Vorstand</mat-option>
          <mat-option value="READONLY">Nur Lesen</mat-option>
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Abbrechen</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!user.username || !user.fullName || !user.role">Speichern</button>
    </mat-dialog-actions>
  `
})
export class UserFormDialogComponent {
  user: any = { role: 'KASSIER', active: true };
  constructor(private dialogRef: MatDialogRef<UserFormDialogComponent>) {}
  save() { this.dialogRef.close(this.user); }
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule, NgIf],
  template: `
    <div class="page-header">
      <h2>Benutzerverwaltung</h2>
      <div class="action-buttons">
        <button mat-raised-button color="primary" (click)="createUser()"><mat-icon>person_add</mat-icon> Neuer Benutzer</button>
      </div>
    </div>
    <mat-card>
      <mat-card-content>
        <div class="table-responsive">
          <table mat-table [dataSource]="users" class="full-width">
            <ng-container matColumnDef="username"><th mat-header-cell *matHeaderCellDef>Benutzername</th><td mat-cell *matCellDef="let u">{{ u.username }}</td></ng-container>
            <ng-container matColumnDef="fullName"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let u">{{ u.fullName }}</td></ng-container>
            <ng-container matColumnDef="role"><th mat-header-cell *matHeaderCellDef>Rolle</th><td mat-cell *matCellDef="let u">{{ u.role }}</td></ng-container>
            <ng-container matColumnDef="active"><th mat-header-cell *matHeaderCellDef>Aktiv</th><td mat-cell *matCellDef="let u">{{ u.active ? 'Ja' : 'Nein' }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="['username','fullName','role','active']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['username','fullName','role','active'];"></tr>
          </table>
        </div>
      </mat-card-content>
    </mat-card>
  `
})
export class UserListComponent implements OnInit {
  users: any[] = [];
  constructor(
    private api: ApiService,
    private dialog: MatDialog,
    private notify: NotificationService,
    private breakpointObserver: BreakpointObserver
  ) {}
  ngOnInit() { this.load(); }
  load() { this.api.get<any[]>('/api/auth/users').subscribe(d => this.users = d); }
  createUser() {
    const isMobile = this.breakpointObserver.isMatched('(max-width: 767px)');
    const ref = this.dialog.open(UserFormDialogComponent, {
      width: isMobile ? '100vw' : '500px',
      maxWidth: isMobile ? '100vw' : '500px',
      height: isMobile ? '100vh' : 'auto',
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.api.post('/api/auth/users', result).subscribe(() => { this.notify.success('Benutzer erstellt'); this.load(); });
      }
    });
  }
}
