import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

interface BankLine {
  id: number;
  bookingDate: string | null;
  bookingText: string | null;
  amount: number;
  suggestedMemberId: number | null;
  suggestedMemberName: string | null;
  matchConfidence: number;
  matchStatus: string;
  isDebit: boolean;
  expanded?: boolean;
  memberSearch?: FormControl;
  memberOptions?: any[];
  selectedMember?: any;
  openYears?: number[];
  selectedYear?: number | null; // null = auto-split
}

@Component({
  selector: 'app-bank-import-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule, MatTooltipModule,
    MatChipsModule, MatAutocompleteModule, MatProgressSpinnerModule,
    DecimalPipe
  ],
  template: `
    <div class="page-header" *ngIf="importData">
      <h2>Bankimport: {{ importData.fileName }}</h2>
      <div class="action-buttons">
        <button mat-raised-button color="primary" (click)="confirmAll()">
          <mat-icon>done_all</mat-icon> Alle >90% bestätigen (Auto-Split)
        </button>
        <button mat-raised-button color="warn" (click)="deleteWholeImport()">
          <mat-icon>delete</mat-icon> Import löschen
        </button>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="stats-row" *ngIf="importData">
      <div class="stat-card">
        <div class="stat-value">{{ allLines.length }}</div>
        <div class="stat-label">Gesamt</div>
      </div>
      <div class="stat-card credit">
        <div class="stat-value">{{ creditCount }}</div>
        <div class="stat-label">Gutschriften</div>
        <div class="stat-amount">CHF {{ creditTotal | number:'1.2-2' }}</div>
      </div>
      <div class="stat-card debit">
        <div class="stat-value">{{ debitCount }}</div>
        <div class="stat-label">Belastungen</div>
        <div class="stat-amount">CHF {{ debitTotal | number:'1.2-2' }}</div>
      </div>
      <div class="stat-card pending">
        <div class="stat-value">{{ pendingCount }}</div>
        <div class="stat-label">Offen</div>
      </div>
    </div>

    <!-- Filter Chips -->
    <div class="filter-bar" *ngIf="importData">
      <mat-chip-set>
        <mat-chip [highlighted]="activeFilter === 'all'" (click)="setFilter('all')">Alle ({{ allLines.length }})</mat-chip>
        <mat-chip [highlighted]="activeFilter === 'credits'" (click)="setFilter('credits')">Gutschriften ({{ creditCount }})</mat-chip>
        <mat-chip [highlighted]="activeFilter === 'debits'" (click)="setFilter('debits')">Belastungen ({{ debitCount }})</mat-chip>
        <mat-chip [highlighted]="activeFilter === 'pending'" (click)="setFilter('pending')">Nur offene ({{ pendingCount }})</mat-chip>
        <mat-chip [highlighted]="activeFilter === 'confirmed'" (click)="setFilter('confirmed')">Bestätigt ({{ confirmedCount }})</mat-chip>
      </mat-chip-set>
    </div>

    <!-- Lines Table -->
    <mat-card *ngIf="importData">
      <mat-card-content>
        <div class="table-responsive">
          <table mat-table [dataSource]="filteredLines" class="full-width">

            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Datum</th>
              <td mat-cell *matCellDef="let l">{{ l.bookingDate }}</td>
            </ng-container>

            <ng-container matColumnDef="text">
              <th mat-header-cell *matHeaderCellDef>Buchungstext</th>
              <td mat-cell *matCellDef="let l" class="text-cell" (click)="l.expanded = !l.expanded">
                <div [class.text-expanded]="l.expanded" [class.text-truncated]="!l.expanded">
                  {{ l.bookingText || '-' }}
                </div>
                <mat-icon class="expand-icon" *ngIf="l.bookingText && l.bookingText.length > 50">
                  {{ l.expanded ? 'expand_less' : 'expand_more' }}
                </mat-icon>
              </td>
            </ng-container>

            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef>Betrag</th>
              <td mat-cell *matCellDef="let l" [class.debit-amount]="l.isDebit" [class.credit-amount]="!l.isDebit">
                <span *ngIf="l.isDebit">-</span>CHF {{ l.amount | number:'1.2-2' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="match">
              <th mat-header-cell *matHeaderCellDef>Mitglied</th>
              <td mat-cell *matCellDef="let l" class="member-cell">
                <ng-container *ngIf="l.matchStatus === 'PENDING' && !l.isDebit">
                  <div class="member-assign">
                    <mat-form-field appearance="outline" class="member-search-field">
                      <input matInput
                             [formControl]="l.memberSearch"
                             [matAutocomplete]="auto"
                             [placeholder]="l.suggestedMemberName || 'Mitglied suchen...'"
                             (focus)="onMemberSearchFocus(l)">
                      <mat-autocomplete #auto="matAutocomplete"
                                        [displayWith]="displayMember"
                                        (optionSelected)="onMemberSelected(l, $event)">
                        <mat-option *ngFor="let m of l.memberOptions" [value]="m">
                          {{ m.firstName }} {{ m.lastName }}
                        </mat-option>
                      </mat-autocomplete>
                    </mat-form-field>
                    <span *ngIf="l.suggestedMemberName && !l.selectedMember" class="auto-suggestion">
                      Auto: {{ l.suggestedMemberName }} ({{ l.matchConfidence }}%)
                    </span>
                  </div>
                </ng-container>
                <ng-container *ngIf="l.matchStatus !== 'PENDING' || l.isDebit">
                  <span *ngIf="l.suggestedMemberName">{{ l.suggestedMemberName }}</span>
                  <span *ngIf="!l.suggestedMemberName" class="muted">-</span>
                </ng-container>
              </td>
            </ng-container>

            <ng-container matColumnDef="year">
              <th mat-header-cell *matHeaderCellDef>Jahr</th>
              <td mat-cell *matCellDef="let l">
                <ng-container *ngIf="l.matchStatus === 'PENDING' && !l.isDebit && hasAssignedMember(l)">
                  <mat-form-field appearance="outline" class="year-select-field">
                    <mat-select [(value)]="l.selectedYear" placeholder="Auto">
                      <mat-option [value]="null">
                        <span class="auto-option">Auto-Split</span>
                      </mat-option>
                      <mat-option *ngFor="let y of l.openYears" [value]="y">{{ y }}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <div class="year-hint" *ngIf="!l.selectedYear && l.openYears?.length">
                    Offen: {{ l.openYears?.join(', ') }}
                  </div>
                </ng-container>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let l">
                <span class="status-chip" [ngClass]="{
                  'status-confirmed': l.matchStatus === 'CONFIRMED',
                  'status-rejected': l.matchStatus === 'REJECTED',
                  'status-pending': l.matchStatus === 'PENDING',
                  'status-debit': l.isDebit
                }">
                  <ng-container *ngIf="l.isDebit && l.matchStatus === 'PENDING'">Belastung</ng-container>
                  <ng-container *ngIf="!l.isDebit || l.matchStatus !== 'PENDING'">{{ statusLabel(l.matchStatus) }}</ng-container>
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let l">
                <span class="action-btns">
                  <ng-container *ngIf="l.matchStatus === 'PENDING' && !l.isDebit">
                    <button mat-icon-button color="primary"
                            (click)="confirm(l, true)"
                            [disabled]="!hasAssignedMember(l)"
                            [matTooltip]="getConfirmTooltip(l)">
                      <mat-icon>check</mat-icon>
                    </button>
                    <button mat-icon-button color="warn"
                            (click)="confirm(l, false)"
                            matTooltip="Ablehnen">
                      <mat-icon>close</mat-icon>
                    </button>
                  </ng-container>
                  <button mat-icon-button color="warn"
                          (click)="deleteLine(l)"
                          matTooltip="Zeile löschen">
                    <mat-icon>delete</mat-icon>
                  </button>
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"
                [class.debit-row]="row.isDebit"
                [class.confirmed-row]="row.matchStatus === 'CONFIRMED'"
                [class.rejected-row]="row.matchStatus === 'REJECTED'">
            </tr>
          </table>
        </div>

        <div *ngIf="filteredLines.length === 0" class="empty-state">
          <mat-icon>filter_list_off</mat-icon>
          <p>Keine Einträge für diesen Filter</p>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
    .stat-card { background: white; border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-left: 4px solid #94a3b8; }
    .stat-card.credit { border-left-color: #10b981; }
    .stat-card.debit { border-left-color: #ef4444; }
    .stat-card.pending { border-left-color: #f59e0b; }
    .stat-value { font-size: 28px; font-weight: 700; color: #1e293b; }
    .stat-label { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-amount { font-size: 14px; font-weight: 500; margin-top: 4px; color: #475569; }

    .filter-bar { margin-bottom: 16px; }
    .filter-bar mat-chip { cursor: pointer; }

    .text-cell { cursor: pointer; max-width: 300px; }
    .text-truncated { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }
    .text-expanded { white-space: pre-line; max-width: 300px; word-break: break-word; }
    .expand-icon { font-size: 16px; width: 16px; height: 16px; color: #94a3b8; vertical-align: middle; cursor: pointer; }
    .debit-amount { color: #ef4444; font-weight: 500; }
    .credit-amount { color: #10b981; font-weight: 500; }
    .debit-row { background-color: #fef2f2 !important; opacity: 0.75; }
    .confirmed-row { background-color: #f0fdf4 !important; }
    .rejected-row { background-color: #fefce8 !important; opacity: 0.6; }
    .muted { color: #94a3b8; }

    .member-cell { min-width: 200px; }
    .member-assign { display: flex; flex-direction: column; gap: 2px; }
    .member-search-field { width: 100%; font-size: 13px; }
    .member-search-field ::ng-deep .mat-mdc-form-field-infix { padding-top: 6px !important; padding-bottom: 6px !important; min-height: 32px !important; }
    .member-search-field ::ng-deep .mdc-text-field { padding: 0 8px !important; }
    .member-search-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .auto-suggestion { font-size: 11px; color: #64748b; font-style: italic; margin-top: -4px; }

    .year-select-field { width: 110px; font-size: 13px; }
    .year-select-field ::ng-deep .mat-mdc-form-field-infix { padding-top: 6px !important; padding-bottom: 6px !important; min-height: 32px !important; }
    .year-select-field ::ng-deep .mdc-text-field { padding: 0 8px !important; }
    .year-select-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .year-hint { font-size: 11px; color: #64748b; margin-top: -4px; }
    .auto-option { font-style: italic; color: #3b82f6; }

    .confidence-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .conf-high { background: #dcfce7; color: #166534; }
    .conf-medium { background: #fef3c7; color: #92400e; }
    .conf-low { background: #fee2e2; color: #991b1b; }
    .conf-none { background: #f1f5f9; color: #94a3b8; }

    .status-chip { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .status-confirmed { background: #dcfce7; color: #166534; }
    .status-rejected { background: #fef3c7; color: #92400e; }
    .status-pending { background: #e0f2fe; color: #0369a1; }
    .status-debit { background: #fee2e2; color: #991b1b; }

    .action-btns { white-space: nowrap; }

    .empty-state { text-align: center; padding: 40px; color: #94a3b8; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }

    @media (max-width: 767px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .stat-value { font-size: 22px; }
      .text-cell, .text-truncated { max-width: 150px; }
      .member-cell { min-width: 160px; }
    }
  `]
})
export class BankImportDetailComponent implements OnInit, OnDestroy {
  importData: any = null;
  allLines: BankLine[] = [];
  filteredLines: BankLine[] = [];
  activeFilter = 'all';
  columns = ['date', 'text', 'amount', 'match', 'year', 'status', 'actions'];

  creditCount = 0;
  debitCount = 0;
  creditTotal = 0;
  debitTotal = 0;
  pendingCount = 0;
  confirmedCount = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private notify: NotificationService
  ) {}

  ngOnInit() { this.load(); }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load() {
    const id = this.route.snapshot.paramMap.get('id');
    this.api.get<any>(`/api/bank-imports/${id}`).subscribe(d => {
      this.importData = d;
      this.allLines = (d.lines || []).map((l: any) => this.enrichLine(l));
      this.computeStats();
      this.applyFilter();
    });
  }

  private enrichLine(l: any): BankLine {
    const ctrl = new FormControl('');
    ctrl.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(val => {
        if (typeof val !== 'string' || val.length < 2) return of([]);
        return this.api.get<any>('/api/members', { search: val, size: 10 });
      })
    ).subscribe(result => {
      const content = result?.content || result;
      l.memberOptions = Array.isArray(content) ? content : [];
    });

    const line: BankLine = {
      ...l,
      isDebit: l.isDebit === true,
      expanded: false,
      memberSearch: ctrl,
      memberOptions: [],
      selectedMember: null,
      openYears: [],
      selectedYear: null
    };

    // Load open years if a member is already assigned
    if (l.suggestedMemberId && !l.isDebit) {
      this.loadOpenYears(line, l.suggestedMemberId);
    }

    return line;
  }

  private loadOpenYears(line: BankLine, memberId: number) {
    this.api.get<number[]>(`/api/bank-imports/open-years/${memberId}`).subscribe(years => {
      line.openYears = years || [];
    });
  }

  private computeStats() {
    this.creditCount = this.allLines.filter(l => !l.isDebit).length;
    this.debitCount = this.allLines.filter(l => l.isDebit).length;
    this.creditTotal = this.allLines.filter(l => !l.isDebit).reduce((s, l) => s + (l.amount || 0), 0);
    this.debitTotal = this.allLines.filter(l => l.isDebit).reduce((s, l) => s + (l.amount || 0), 0);
    this.pendingCount = this.allLines.filter(l => l.matchStatus === 'PENDING' && !l.isDebit).length;
    this.confirmedCount = this.allLines.filter(l => l.matchStatus === 'CONFIRMED').length;
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
    this.applyFilter();
  }

  private applyFilter() {
    switch (this.activeFilter) {
      case 'credits': this.filteredLines = this.allLines.filter(l => !l.isDebit); break;
      case 'debits': this.filteredLines = this.allLines.filter(l => l.isDebit); break;
      case 'pending': this.filteredLines = this.allLines.filter(l => l.matchStatus === 'PENDING' && !l.isDebit); break;
      case 'confirmed': this.filteredLines = this.allLines.filter(l => l.matchStatus === 'CONFIRMED'); break;
      default: this.filteredLines = [...this.allLines];
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'CONFIRMED': return 'Bestätigt';
      case 'REJECTED': return 'Abgelehnt';
      case 'PENDING': return 'Offen';
      case 'IGNORED': return 'Ignoriert';
      default: return status;
    }
  }

  displayMember(member: any): string {
    return member ? `${member.firstName} ${member.lastName}` : '';
  }

  onMemberSearchFocus(line: BankLine) {
    if (!line.memberOptions?.length && line.memberSearch) {
      const val = line.memberSearch.value;
      if (typeof val === 'string' && val.length >= 2) {
        this.api.get<any>('/api/members', { search: val, size: 10 }).subscribe(result => {
          const content = result?.content || result;
          line.memberOptions = Array.isArray(content) ? content : [];
        });
      }
    }
  }

  onMemberSelected(line: BankLine, event: any) {
    const member = event.option.value;
    line.selectedMember = member;
    line.suggestedMemberId = member.id;
    line.suggestedMemberName = `${member.firstName} ${member.lastName}`;
    line.matchConfidence = 100;
    line.selectedYear = null;

    this.loadOpenYears(line, member.id);

    this.api.post('/api/bank-imports/assign-member', {
      lineId: line.id,
      memberId: member.id
    }).subscribe({
      next: () => this.notify.success(`Mitglied ${member.firstName} ${member.lastName} zugewiesen`),
      error: () => this.notify.error('Zuweisung fehlgeschlagen')
    });
  }

  hasAssignedMember(line: BankLine): boolean {
    return !!(line.suggestedMemberId || line.selectedMember);
  }

  getConfirmTooltip(line: BankLine): string {
    if (!this.hasAssignedMember(line)) return 'Zuerst Mitglied zuweisen';
    if (line.selectedYear) return `Bestätigen für ${line.selectedYear}`;
    if (line.openYears?.length) return `Auto-Split auf: ${line.openYears.join(', ')}`;
    return 'Bestätigen (Auto-Split)';
  }

  confirm(line: BankLine, isConfirm: boolean) {
    const memberId = line.selectedMember?.id || line.suggestedMemberId;
    const body: any = {
      lineId: line.id,
      memberId: memberId,
      confirm: isConfirm
    };
    // Only send forYear if user explicitly selected one (otherwise auto-split)
    if (line.selectedYear) {
      body.forYear = line.selectedYear;
    }

    this.api.post('/api/bank-imports/confirm', body).subscribe(() => {
      if (isConfirm) {
        const yearInfo = line.selectedYear
          ? `für ${line.selectedYear}`
          : `Auto-Split auf offene Jahre`;
        this.notify.success(`Bestätigt ${yearInfo}`);
      } else {
        this.notify.success('Abgelehnt');
      }
      line.matchStatus = isConfirm ? 'CONFIRMED' : 'REJECTED';
      this.computeStats();
      this.applyFilter();
    });
  }

  confirmAll() {
    this.api.post(`/api/bank-imports/${this.importData.id}/confirm-all`, {}).subscribe(() => {
      this.notify.success('Alle hoch-konfidenten Einträge bestätigt (Auto-Split)');
      this.load();
    });
  }

  deleteWholeImport() {
    if (!confirm(`Import "${this.importData.fileName}" wirklich löschen? Alle zugehörigen Zeilen und Buchungen werden gelöscht.`)) return;
    this.api.delete(`/api/bank-imports/${this.importData.id}`).subscribe({
      next: () => {
        this.notify.success('Import gelöscht');
        this.router.navigate(['/bank-import']);
      },
      error: () => this.notify.error('Löschen fehlgeschlagen')
    });
  }

  deleteLine(line: BankLine) {
    if (!confirm('Diese Zeile wirklich löschen? Zugehörige Buchungen werden ebenfalls gelöscht.')) return;
    this.api.delete(`/api/bank-imports/lines/${line.id}`).subscribe({
      next: () => {
        this.notify.success('Zeile gelöscht');
        this.allLines = this.allLines.filter(l => l.id !== line.id);
        this.computeStats();
        this.applyFilter();
      },
      error: () => this.notify.error('Löschen fehlgeschlagen')
    });
  }
}
