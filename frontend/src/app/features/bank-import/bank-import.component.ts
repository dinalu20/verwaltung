import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NgIf, NgFor } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-bank-import',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatProgressBarModule, NgIf, NgFor],
  template: `
    <div class="page-header">
      <h2>Bankimport</h2>
    </div>

    <mat-card class="upload-card">
      <mat-card-content>
        <div class="upload-area" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
          <mat-icon class="upload-icon">account_balance</mat-icon>
          <p>Bank CSV/Excel hierher ziehen oder</p>
          <button mat-raised-button color="primary" (click)="fileInput.click()">Datei auswählen</button>
          <input #fileInput type="file" accept=".csv,.xlsx,.xls" (change)="onFileSelected($event)" hidden>
        </div>
        <mat-progress-bar *ngIf="uploading" mode="indeterminate"></mat-progress-bar>
      </mat-card-content>
    </mat-card>

    <mat-card *ngIf="imports.length > 0">
      <mat-card-content>
        <h3>Bisherige Imports</h3>
        <div class="table-responsive">
          <table mat-table [dataSource]="imports" class="full-width">
            <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Datum</th><td mat-cell *matCellDef="let i">{{ i.importDate }}</td></ng-container>
            <ng-container matColumnDef="file"><th mat-header-cell *matHeaderCellDef>Datei</th><td mat-cell *matCellDef="let i">{{ i.fileName }}</td></ng-container>
            <ng-container matColumnDef="total"><th mat-header-cell *matHeaderCellDef>Zeilen</th><td mat-cell *matCellDef="let i">{{ i.totalLines }}</td></ng-container>
            <ng-container matColumnDef="pending"><th mat-header-cell *matHeaderCellDef>Offen</th><td mat-cell *matCellDef="let i">{{ i.pendingLines }}</td></ng-container>
            <ng-container matColumnDef="confirmed"><th mat-header-cell *matHeaderCellDef>Bestätigt</th><td mat-cell *matCellDef="let i">{{ i.confirmedLines }}</td></ng-container>
            <ng-container matColumnDef="action"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let i">
              <button mat-button color="primary" (click)="openImport(i)">Details</button>
            </td></ng-container>
            <tr mat-header-row *matHeaderRowDef="importCols"></tr>
            <tr mat-row *matRowDef="let row; columns: importCols;"></tr>
          </table>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .upload-card { margin-bottom: 24px; }
    .upload-icon { font-size: 48px; width: 48px; height: 48px; color: #999; }
  `]
})
export class BankImportComponent implements OnInit {
  imports: any[] = [];
  importCols = ['date', 'file', 'total', 'pending', 'confirmed', 'action'];
  uploading = false;

  constructor(private api: ApiService, private router: Router, private notify: NotificationService) {}

  ngOnInit() { this.loadImports(); }

  loadImports() { this.api.get<any[]>('/api/bank-imports').subscribe(d => this.imports = d); }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.upload(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.upload(file);
  }

  upload(file: File) {
    this.uploading = true;
    this.api.upload<any>('/api/bank-imports', file).subscribe({
      next: (res) => { this.uploading = false; this.notify.success('Import verarbeitet'); this.router.navigate(['/bank-import', res.id]); },
      error: () => { this.uploading = false; this.notify.error('Import fehlgeschlagen'); }
    });
  }

  openImport(imp: any) { this.router.navigate(['/bank-import', imp.id]); }
}
