import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { MemberFormDialogComponent } from './member-form-dialog.component';

interface Member {
  id: number; lastName: string; firstName: string; street: string;
  zipCode: string; city: string; phonePrivate: string; phoneMobile: string;
  status: string; externalId: string; paymentNote: string;
}

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [FormsModule, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule, MatDialogModule],
  template: `
    <div class="page-header">
      <h2>Mitglieder</h2>
      <div>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon> Neues Mitglied
        </button>
      </div>
    </div>

    <mat-card>
      <mat-card-content>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Suche (Name, Ort, PLZ)</mat-label>
          <input matInput [(ngModel)]="searchTerm" (ngModelChange)="onSearchChange($event)" (keyup.enter)="search()" placeholder="Suchen...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <table mat-table [dataSource]="members" class="full-width">
          <ng-container matColumnDef="lastName">
            <th mat-header-cell *matHeaderCellDef>Nachname</th>
            <td mat-cell *matCellDef="let m">{{ m.lastName }}</td>
          </ng-container>
          <ng-container matColumnDef="firstName">
            <th mat-header-cell *matHeaderCellDef>Vorname</th>
            <td mat-cell *matCellDef="let m">{{ m.firstName }}</td>
          </ng-container>
          <ng-container matColumnDef="city">
            <th mat-header-cell *matHeaderCellDef>Ort</th>
            <td mat-cell *matCellDef="let m">{{ m.zipCode }} {{ m.city }}</td>
          </ng-container>
          <ng-container matColumnDef="phone">
            <th mat-header-cell *matHeaderCellDef>Telefon</th>
            <td mat-cell *matCellDef="let m">{{ m.phoneMobile || m.phonePrivate || '-' }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let m">
              <span class="status-badge" [class.status-paid]="m.status === 'ACTIVE'" [class.status-open]="m.status === 'INACTIVE'">
                {{ m.status === 'ACTIVE' ? 'Aktiv' : 'Inaktiv' }}
              </span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" (click)="openDetail(row)"></tr>
        </table>
        <mat-paginator [pageSize]="50" [pageSizeOptions]="[25, 50, 100]" (page)="onPage($event)"></mat-paginator>
      </mat-card-content>
    </mat-card>
  `
})
export class MemberListComponent implements OnInit, OnDestroy {
  members: Member[] = [];
  displayedColumns = ['lastName', 'firstName', 'city', 'phone', 'status'];
  searchTerm = '';
  page = 0;
  pageSize = 50;
  totalElements = 0;
  private searchSubject = new Subject<string>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private api: ApiService, private router: Router, private dialog: MatDialog, private notify: NotificationService) {}

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.page = 0;
      this.search();
    });
    this.search();
  }

  ngOnDestroy() { this.searchSubject.complete(); }

  onSearchChange(value: string) { this.searchSubject.next(value); }

  search() {
    this.api.get<any>('/api/members', { search: this.searchTerm, page: this.page, size: this.pageSize }).subscribe(res => {
      this.members = res.content;
      this.totalElements = res.totalElements;
    });
  }

  onPage(event: any) {
    this.page = event.pageIndex;
    this.pageSize = event.pageSize;
    this.search();
  }

  openDetail(member: Member) {
    this.router.navigate(['/members', member.id]);
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(MemberFormDialogComponent, { width: '600px', data: {} });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.api.post('/api/members', result).subscribe(() => {
          this.notify.success('Mitglied erstellt');
          this.search();
        });
      }
    });
  }
}
