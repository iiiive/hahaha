import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';

export interface AdminUserRow {
  userId: number;
  fullName: string;
  email: string;
  roleId: number;
  createdAt?: string;
  modifiedAt?: string;
  isApproved: boolean;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private baseUrl = 'https://localhost:7006/api/admin/users';

  constructor(private http: HttpClient) {}

  getPending(): Observable<AdminUserRow[]> {
    return this.http.get<AdminUserRow[]>(`${this.baseUrl}/pending`).pipe(
      map(rows =>
        rows.map(r => ({ ...r, status: r.status || 'Pending' }))
      )
    );
  }

  // ✅ History (10 recent) with fallback
  getHistory(): Observable<AdminUserRow[]> {
    return this.http.get<AdminUserRow[]>(`${this.baseUrl}/history`).pipe(
      map(rows => rows.slice(0, 10)),
      catchError((err) => {
        if (err?.status === 404) {
          // ✅ fallback to existing endpoint: GET /api/admin/users
          return this.http.get<AdminUserRow[]>(`${this.baseUrl}`).pipe(
            map(rows =>
              rows
                .map(r => ({ ...r, status: r.status || 'Pending' }))
                .filter(r => (r.status || '').toLowerCase() === 'approved' || (r.status || '').toLowerCase() === 'declined')
                .slice(0, 10)
            )
          );
        }
        return throwError(() => err);
      })
    );
  }

  approve(userId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/${userId}/approve`, {});
  }

  decline(userId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/${userId}/decline`, {});
  }
}
