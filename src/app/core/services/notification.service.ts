import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AppNotification {
  notificationId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface MyNotificationsResponse {
  unreadCount: number;
  items: AppNotification[];
}

/** ✅ SAFE ALIAS so your existing components don't break */
export type NotificationItem = AppNotification;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  // ✅ GET /api/notifications/my?take=30
  getMy(take: number = 30): Observable<MyNotificationsResponse> {
    return this.http
      .get<any>(`${this.apiUrl}/my?take=${take}`, { headers: this.getAuthHeaders() })
      .pipe(
        map((res) => {
          const rawItems = Array.isArray(res?.items) ? res.items : [];

          const items: AppNotification[] = rawItems.map((n: any) => ({
            notificationId: Number(n.notificationId ?? n.NotificationId ?? 0),
            type: String(n.type ?? n.Type ?? 'General'),
            title: String(n.title ?? n.Title ?? ''),
            message: String(n.message ?? n.Message ?? ''),
            isRead: Boolean(n.isRead ?? n.IsRead ?? false),
            createdAt: String(n.createdAt ?? n.CreatedAt ?? '')
          }));

          return {
            unreadCount: Number(res?.unreadCount ?? res?.UnreadCount ?? 0),
            items
          };
        })
      );
  }

  markRead(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/read`, {}, { headers: this.getAuthHeaders() });
  }

  markAllRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/read-all`, {}, { headers: this.getAuthHeaders() });
  }
}
