import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'token';
  private roleKey = 'role';

  private loggedInSubject = new BehaviorSubject<boolean>(this.isAuthenticated());
  loggedIn$ = this.loggedInSubject.asObservable();

  // ✅ admin detection resilient (case-insensitive)
  private isAdminSubject = new BehaviorSubject<boolean>(this.isRoleAdmin(this.getRole()));
  isAdmin$ = this.isAdminSubject.asObservable();

  constructor(private api: ApiService, private router: Router) {
    // ✅ On refresh: if token exists but role missing, derive role from token
    const token = this.getToken();
    if (token && !this.getRole()) {
      const role = this.extractRoleFromToken(token);
      if (role) {
        localStorage.setItem(this.roleKey, role);
        this.isAdminSubject.next(this.isRoleAdmin(role));
      }
    }
  }

  login(credentials: { email: string; password: string }) {
    // ✅ Match Swagger route: /api/Auth/login
    return this.api.post<any>('Auth/login', credentials).pipe(
      tap(res => {
        if (res?.token) {
          localStorage.setItem(this.tokenKey, res.token);

          const role = this.extractRoleFromToken(res.token);
          if (role) localStorage.setItem(this.roleKey, role);
          else localStorage.removeItem(this.roleKey);

          this.loggedInSubject.next(true);
          this.isAdminSubject.next(this.isRoleAdmin(role));
        }
      })
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.roleKey);

    this.loggedInSubject.next(false);
    this.isAdminSubject.next(false);

    // ✅ FIX: go back to first page immediately (no refresh needed)
    this.router.navigateByUrl('/login'); // change to '/' if your first page is home
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  getRole(): string | null {
    return localStorage.getItem(this.roleKey);
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    return this.isRoleAdmin(this.getRole());
  }

  // ----------------- helpers -----------------

  private isRoleAdmin(role: string | null | undefined): boolean {
    return (role || '').toLowerCase() === 'admin';
  }

  private extractRoleFromToken(token: string): string | null {
    try {
      const payload = this.decodeJwtPayload(token);
      if (!payload) return null;

      // ✅ support different role claim keys
      const role =
        payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
        payload['role'] ??
        payload['Role'];

      return typeof role === 'string' ? role : null;
    } catch {
      return null;
    }
  }

  private decodeJwtPayload(token: string): any | null {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    // JWT payload is base64url
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');

    const json = atob(padded);
    return JSON.parse(json);
  }
}
