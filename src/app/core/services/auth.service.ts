import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { BehaviorSubject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'token';
  private roleKey = 'role';

  // Observable to track login state
  private loggedInSubject = new BehaviorSubject<boolean>(this.isAuthenticated());
  loggedIn$ = this.loggedInSubject.asObservable();

  // Track admin role reactively
  private isAdminSubject = new BehaviorSubject<boolean>(this.getRole() === 'admin');
  isAdmin$ = this.isAdminSubject.asObservable();

  constructor(private api: ApiService) { }

  login(credentials: { email: string; password: string }) {
    return this.api.post<any>('auth/login', credentials).pipe(
      tap(res => {
        if (res && res.token) {
          localStorage.setItem(this.tokenKey, res.token);

          // Parse role from JWT and store
          const payload = JSON.parse(atob(res.token.split('.')[1]));
          const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

          localStorage.setItem(this.roleKey, role);

          // Notify reactive subscribers
          this.loggedInSubject.next(true);
          this.isAdminSubject.next(role === 'Admin');
        }
      })
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.roleKey);
    this.loggedInSubject.next(false); // notify subscribers
    this.isAdminSubject.next(false);
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
    return this.getRole() === 'Admin';
  }
}
