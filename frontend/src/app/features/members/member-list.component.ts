import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subject, Subscription } from 'rxjs';
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
  imports: [FormsModule, MatTableModule, MatPaginatorModule, MatSortModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatCardModule, MatSelectModule, MatDialogModule],
  template: `
    <div class="page-header">
      <h2>Mitglieder</h2>
      <div class="action-buttons">
        <button mat-raised-button (click)="exportCsv()">
          <mat-icon>description</mat-icon> CSV
        </button>
        <button mat-raised-button (click)="exportExcel()">
          <mat-icon>table_chart</mat-icon> Excel
        </button>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon> Neues Mitglied
        </button>
      </div>
    </div>

    <mat-card>
      <mat-card-content>
        <div class="filter-row">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Suche (Name, Ort, PLZ)</mat-label>
            <input matInput [(ngModel)]="searchTerm" (ngModelChange)="onSearchChange($event)" (keyup.enter)="search()" placeholder="Suchen...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <mat-form-field appearance="outline" class="status-field">
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="statusFilter" (selectionChange)="onStatusChange()">
              <mat-option value="">Aktiv</mat-option>
              <mat-option value="INACTIVE">Inaktiv</mat-option>
              <mat-option value="ALL">Alle</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="table-responsive">
          <table mat-table [dataSource]="members" matSort (matSortChange)="onSort($event)" class="full-width">
            <ng-container matColumnDef="lastName">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nachname</th>
              <td mat-cell *matCellDef="let m">{{ m.lastName }}</td>
            </ng-container>
            <ng-container matColumnDef="firstName">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Vorname</th>
              <td mat-cell *matCellDef="let m">{{ m.firstName }}</td>
            </ng-container>
            <ng-container matColumnDef="city">
              <th mat-header-cell *matHeaderCellDef mat-sort-header="city">Ort</th>
              <td mat-cell *matCellDef="let m">{{ m.zipCode }} {{ m.city }}</td>
            </ng-container>
            <ng-container matColumnDef="phone">
              <th mat-header-cell *matHeaderCellDef>Telefon</th>
              <td mat-cell *matCellDef="let m">{{ m.phoneMobile || m.phonePrivate || '-' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let m">
                <span class="status-badge" [class.status-paid]="m.status === 'ACTIVE'" [class.status-open]="m.status === 'INACTIVE'">
                  {{ m.status === 'ACTIVE' ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" (click)="openDetail(row)"></tr>
          </table>
        </div>
        <mat-paginator [length]="totalElements" [pageSize]="pageSize" [pageIndex]="page"
          [pageSizeOptions]="[25, 50, 100]" (page)="onPage($event)" showFirstLastButtons>
        </mat-paginator>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .filter-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .search-field { flex: 2; }
    .status-field { flex: 1; min-width: 120px; }

    @media (max-width: 767px) {
      .filter-row { flex-direction: column; gap: 0; }
      .search-field, .status-field { width: 100%; }
    }
  `]
})
export class MemberListComponent implements OnInit, OnDestroy {
  members: Member[] = [];
  displayedColumns = ['lastName', 'firstName', 'city', 'phone', 'status'];
  searchTerm = '';
  statusFilter = '';
  page = 0;
  pageSize = 50;
  totalElements = 0;
  sortField = 'lastName';
  sortDirection = 'asc';
  private searchSubject = new Subject<string>();
  private subs: Subscription[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private api: ApiService,
    private router: Router,
    private dialog: MatDialog,
    private notify: NotificationService,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit() {
    this.subs.push(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(() => {
        this.page = 0;
        this.search();
      })
    );

    this.subs.push(
      this.breakpointObserver.observe('(max-width: 767px)').subscribe(result => {
        this.displayedColumns = result.matches
          ? ['lastName', 'firstName', 'status']
          : ['lastName', 'firstName', 'city', 'phone', 'status'];
      })
    );

    this.search();
  }

  ngOnDestroy() { this.searchSubject.complete(); this.subs.forEach(s => s.unsubscribe()); }

  onSearchChange(value: string) { this.searchSubject.next(value); }

  onStatusChange() {
    this.page = 0;
    this.search();
  }

  onSort(sort: Sort) {
    this.sortField = sort.active || 'lastName';
    this.sortDirection = sort.direction || 'asc';
    this.page = 0;
    this.search();
  }

  search() {
    const params: any = {
      search: this.searchTerm,
      page: this.page,
      size: this.pageSize,
      sort: `${this.sortField},${this.sortDirection}`
    };
    if (this.statusFilter === 'ALL') {
      params.status = 'ACTIVE';
    } else if (this.statusFilter) {
      params.status = this.statusFilter;
    }
    this.api.get<any>('/api/members', params).subscribe(res => {
      if (this.statusFilter === 'ALL') {
        this.api.get<any>('/api/members', { ...params, status: 'INACTIVE' }).subscribe(res2 => {
          this.members = [...res.content, ...res2.content];
          this.totalElements = res.totalElements + res2.totalElements;
        });
      } else {
        this.members = res.content;
        this.totalElements = res.totalElements;
      }
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

  exportCsv() {
    this.api.downloadFile('/api/members/export/csv', 'Mitglieder.csv', { search: this.searchTerm, status: this.statusFilter || '' });
  }

  exportExcel() {
    this.api.downloadFile('/api/members/export/excel', 'Mitglieder.xlsx', { search: this.searchTerm, status: this.statusFilter || '' });
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(MemberFormDialogComponent, {
      width: this.breakpointObserver.isMatched('(max-width: 767px)') ? '100vw' : '600px',
      maxWidth: this.breakpointObserver.isMatched('(max-width: 767px)') ? '100vw' : '600px',
      height: this.breakpointObserver.isMatched('(max-width: 767px)') ? '100vh' : 'auto',
      data: {}
    });
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
