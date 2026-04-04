import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  username: string;
  fullName: string;
  role: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = '/api/auth';
  private currentUserSubject = new BehaviorSubject<AuthResponse | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      this.currentUserSubject.next(JSON.parse(stored));
    }
  }

  get currentUser(): AuthResponse | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentUser?.accessToken;
  }

  get token(): string | null {
    return this.currentUser?.accessToken ?? null;
  }

  get role(): string | null {
    return this.currentUser?.role ?? null;
  }

  hasRole(...roles: string[]): boolean {
    return roles.includes(this.currentUser?.role ?? '');
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/login`, request).pipe(
      tap(user => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  refresh(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/refresh`, {
      refreshToken: this.currentUser?.refreshToken
    }).pipe(
      tap(user => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }
}
