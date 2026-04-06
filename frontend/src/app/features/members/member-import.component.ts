import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NgIf, NgFor } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-member-import',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatProgressBarModule, NgIf, NgFor],
  template: `
    <h2>Mitglieder CSV-Import</h2>
    <mat-card>
      <mat-card-content>
        <div class="upload-area" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
          <mat-icon class="upload-icon">cloud_upload</mat-icon>
          <p>CSV-Datei hierher ziehen oder</p>
          <button mat-raised-button color="primary" (click)="fileInput.click()">Datei auswählen</button>
          <input #fileInput type="file" accept=".csv" (change)="onFileSelected($event)" hidden>
          <p *ngIf="selectedFile" class="file-name"><strong>{{ selectedFile.name }}</strong></p>
        </div>

        <mat-progress-bar *ngIf="loading" mode="indeterminate" class="progress"></mat-progress-bar>

        <div *ngIf="preview">
          <h3>Vorschau: {{ preview.totalRows }} Zeilen ({{ preview.imported }} neu, {{ preview.updated }} aktualisiert, {{ preview.skipped }} übersprungen)</h3>

          <div *ngIf="preview.errors.length > 0" class="error-list">
            <p *ngFor="let e of preview.errors">{{ e }}</p>
          </div>

          <div class="table-responsive">
            <table mat-table [dataSource]="preview.preview" class="preview-table">
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let r">
                <span class="status-badge" [class.status-paid]="r.status==='NEW'" [class.status-partial]="r.status==='UPDATE'">{{ r.status }}</span>
              </td></ng-container>
              <ng-container matColumnDef="lastName"><th mat-header-cell *matHeaderCellDef>Nachname</th><td mat-cell *matCellDef="let r">{{ r.lastName }}</td></ng-container>
              <ng-container matColumnDef="firstName"><th mat-header-cell *matHeaderCellDef>Vorname</th><td mat-cell *matCellDef="let r">{{ r.firstName }}</td></ng-container>
              <ng-container matColumnDef="city"><th mat-header-cell *matHeaderCellDef>Ort</th><td mat-cell *matCellDef="let r">{{ r.city }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="['status','lastName','firstName','city']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['status','lastName','firstName','city']"></tr>
            </table>
          </div>

          <button mat-raised-button color="primary" (click)="confirmImport()" [disabled]="importing" class="confirm-btn">
            <mat-icon>check</mat-icon> Import bestätigen
          </button>
        </div>

        <div *ngIf="result">
          <h3 class="success-text">Import abgeschlossen!</h3>
          <p>{{ result.imported }} importiert, {{ result.updated }} aktualisiert, {{ result.skipped }} übersprungen</p>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .upload-icon { font-size: 48px; width: 48px; height: 48px; color: #999; }
    .file-name { margin-top: 8px; }
    .progress { margin: 16px 0; }
    .error-list { color: #e53935; margin: 8px 0; }
    .preview-table { margin: 16px 0; }
    .confirm-btn { margin-top: 8px; }
    .success-text { color: #2e7d32; }
  `]
})
export class MemberImportComponent {
  selectedFile: File | null = null;
  preview: any = null;
  result: any = null;
  loading = false;
  importing = false;

  constructor(private api: ApiService, private notify: NotificationService) {}

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    if (this.selectedFile) this.uploadPreview();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) { this.selectedFile = file; this.uploadPreview(); }
  }

  uploadPreview() {
    if (!this.selectedFile) return;
    this.loading = true;
    this.preview = null;
    this.result = null;
    this.api.upload<any>('/api/members/import/preview', this.selectedFile).subscribe({
      next: (res) => { this.preview = res; this.loading = false; },
      error: () => { this.notify.error('Vorschau fehlgeschlagen'); this.loading = false; }
    });
  }

  confirmImport() {
    if (!this.selectedFile) return;
    this.importing = true;
    this.api.upload<any>('/api/members/import', this.selectedFile).subscribe({
      next: (res) => { this.result = res; this.preview = null; this.importing = false; this.notify.success('Import erfolgreich'); },
      error: () => { this.notify.error('Import fehlgeschlagen'); this.importing = false; }
    });
  }
}
