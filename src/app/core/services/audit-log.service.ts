import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuditLog } from '../../shared/models/auditlog';

export type AuditModule = 'All' | 'Scheduling' | 'Documents' | 'Donations' | 'WordOfGod';

export interface AuditLogQuery {
  module?: AuditModule;
  adminUserId?: number | null;
  from?: string | null; // yyyy-mm-dd
  to?: string | null;   // yyyy-mm-dd
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private apiUrl = `${environment.apiUrl}/AuditLogs`;

  constructor(private http: HttpClient) {}

  getLogs(query?: AuditLogQuery): Observable<AuditLog[]> {
    let params = new HttpParams();

    if (query?.module && query.module !== 'All') params = params.set('module', query.module);
    if (query?.adminUserId != null) params = params.set('adminUserId', String(query.adminUserId));
    if (query?.from) params = params.set('from', query.from);
    if (query?.to) params = params.set('to', query.to);

    return this.http.get<AuditLog[]>(this.apiUrl, { params });
  }

  // ✅ SuperAdmin-only (backend enforces)
  clearLogs(): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.apiUrl}/clear`);
  }
}
