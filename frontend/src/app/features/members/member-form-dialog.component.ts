import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-member-form-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.id ? 'Mitglied bearbeiten' : 'Neues Mitglied' }}</h2>
    <mat-dialog-content>
      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>Nachname</mat-label>
          <input matInput [(ngModel)]="member.lastName" required>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Vorname</mat-label>
          <input matInput [(ngModel)]="member.firstName" required>
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Adresse</mat-label>
        <input matInput [(ngModel)]="member.street">
      </mat-form-field>
      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>PLZ</mat-label>
          <input matInput [(ngModel)]="member.zipCode">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Ort</mat-label>
          <input matInput [(ngModel)]="member.city">
        </mat-form-field>
      </div>
      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>Telefon Privat</mat-label>
          <input matInput [(ngModel)]="member.phonePrivate">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Telefon Mobil</mat-label>
          <input matInput [(ngModel)]="member.phoneMobile">
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Abbrechen</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!member.lastName || !member.firstName">Speichern</button>
    </mat-dialog-actions>
  `
})
export class MemberFormDialogComponent {
  member: any;
  constructor(public dialogRef: MatDialogRef<MemberFormDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
    this.member = { ...data };
  }
  save() { this.dialogRef.close(this.member); }
}
