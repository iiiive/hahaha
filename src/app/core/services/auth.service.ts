import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

type AppRole = 'User' | 'Admin' | 'SuperAdmin' | '';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'token';
  private roleKey = 'role';

  private loggedInSubject = new BehaviorSubject<boolean>(this.isAuthenticated());
  loggedIn$ = this.loggedInSubject.asObservable();

  // ✅ Admin access = Admin OR SuperAdmin
  private isAdminSubject = new BehaviorSubject<boolean>(this.isAdminAccessRole(this.getRole()));
  isAdmin$ = this.isAdminSubject.asObservable();

  constructor(private api: ApiService, private router: Router) {
    // ✅ On refresh: always re-derive role from token (prevents stale localStorage role)
    const token = this.getToken();
    if (token) {
      const derived = this.deriveRoleFromToken(token);
      if (derived) {
        localStorage.setItem(this.roleKey, derived);
        this.isAdminSubject.next(this.isAdminAccessRole(derived));
      }
    }
  }

  login(credentials: { email: string; password: string }) {
    return this.api.post<any>('Auth/login', credentials).pipe(
      tap(res => {
        if (res?.token) {
          localStorage.setItem(this.tokenKey, res.token);

          // ✅ Always derive role from the token returned by server
          const derived = this.deriveRoleFromToken(res.token);
          if (derived) localStorage.setItem(this.roleKey, derived);
          else localStorage.removeItem(this.roleKey);

          this.loggedInSubject.next(true);
          this.isAdminSubject.next(this.isAdminAccessRole(derived));
        }
      })
    );
  }

  // ✅ NEW: Register / Create Account (pending approval)
  register(dto: {
    fullName: string;
    email: string;
    password: string;
    roleId: number;
    completeAddress?: string | null;
    phoneNumber?: string | null;
  }) {
    return this.api.post<any>('Auth/register', dto);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.roleKey);

    this.loggedInSubject.next(false);
    this.isAdminSubject.next(false);

    this.router.navigateByUrl('/login');
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

  /** ✅ Admin pages access (Admin OR SuperAdmin) */
  isAdmin(): boolean {
    return this.isAdminAccessRole(this.getNormalizedRole());
  }

  /** ✅ SuperAdmin-only checks */
  isSuperAdmin(): boolean {
    return this.getNormalizedRole() === 'SuperAdmin';
  }

  /** ✅ Always return reliable role based on token first (not stale localStorage) */
  getNormalizedRole(): AppRole {
    const token = this.getToken();
    if (token) {
      const derived = this.normalizeRoleString(this.deriveRoleFromToken(token));
      if (derived) {
        localStorage.setItem(this.roleKey, derived);
        return derived;
      }
    }

    return this.normalizeRoleString(this.getRole());
  }

  // ✅ ADD: Used by BookmarkService to make per-user storage key
  getUserId(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = this.decodeJwtPayload(token);
      if (!payload) return null;

      // Common claim keys
      const nameId =
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ??
        payload['nameid'];

      const sub = payload['sub'];

      const fallback =
        payload['userId'] ??
        payload['userid'] ??
        payload['id'];

      const val = nameId ?? sub ?? fallback ?? null;
      return val != null && String(val).trim() !== '' ? String(val) : null;
    } catch {
      return null;
    }
  }

  // ----------------- helpers -----------------

  private isAdminAccessRole(role: string | null | undefined): boolean {
    const r = (role || '').trim().toLowerCase();
    return r === 'admin' || r === 'superadmin';
  }

  private normalizeRoleString(role: string | null | undefined): AppRole {
    const r = (role || '').trim().toLowerCase();

    if (r === 'superadmin' || r === 'super admin' || r === 'super_admin') return 'SuperAdmin';
    if (r === 'admin') return 'Admin';
    if (r === 'user') return 'User';

    return '';
  }

  private deriveRoleFromToken(token: string): string | null {
    try {
      const payload = this.decodeJwtPayload(token);
      if (!payload) return null;

      const roleClaim =
        payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
        payload['role'] ??
        payload['Role'];

      if (typeof roleClaim === 'string' && roleClaim.trim()) {
        return roleClaim;
      }

      // ✅ fallback: roleId mapping
      const roleId = payload['roleId'];
      const id = typeof roleId === 'string' ? parseInt(roleId, 10) : roleId;

      if (id === 3) return 'SuperAdmin';
      if (id === 1) return 'Admin';
      if (id === 2) return 'User';

      return null;
    } catch {
      return null;
    }
  }

  private decodeJwtPayload(token: string): any | null {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');

    const json = atob(padded);
    return JSON.parse(json);
  }
}
