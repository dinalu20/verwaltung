import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'members', loadComponent: () => import('./features/members/member-list.component').then(m => m.MemberListComponent) },
      { path: 'members/:id', loadComponent: () => import('./features/members/member-detail.component').then(m => m.MemberDetailComponent) },
      { path: 'members-import', loadComponent: () => import('./features/members/member-import.component').then(m => m.MemberImportComponent) },
      { path: 'payments', loadComponent: () => import('./features/payments/payment-form.component').then(m => m.PaymentFormComponent) },
      { path: 'receipts', loadComponent: () => import('./features/receipts/receipt-list.component').then(m => m.ReceiptListComponent) },
      { path: 'cashbooks', loadComponent: () => import('./features/cashbook/cashbook-list.component').then(m => m.CashBookListComponent) },
      { path: 'cashbooks/:id', loadComponent: () => import('./features/cashbook/cashbook-detail.component').then(m => m.CashBookDetailComponent) },
      { path: 'annual-list', loadComponent: () => import('./features/annual-list/annual-list.component').then(m => m.AnnualListComponent) },
      { path: 'bank-import', loadComponent: () => import('./features/bank-import/bank-import.component').then(m => m.BankImportComponent) },
      { path: 'bank-import/:id', loadComponent: () => import('./features/bank-import/bank-import-detail.component').then(m => m.BankImportDetailComponent) },
      { path: 'users', loadComponent: () => import('./features/users/user-list.component').then(m => m.UserListComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
