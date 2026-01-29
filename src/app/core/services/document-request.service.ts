import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Documentrequest } from '../../shared/models/documentrequest';

@Injectable({
  providedIn: 'root'
})
export class DocumentRequestService {

  // ✅ Matches backend: [Route("api/[controller]")] + DocumentRequestController
  private apiUrl = `${environment.apiUrl}/DocumentRequest`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  getAll(): Observable<Documentrequest[]> {
    return this.http.get<Documentrequest[]>(this.apiUrl, {
      headers: this.getAuthHeaders()
    });
  }

  getMy(): Observable<Documentrequest[]> {
  return this.http.get<Documentrequest[]>(`${this.apiUrl}/my`, {
    headers: this.getAuthHeaders()
  });
}



  getById(id: number): Observable<Documentrequest> {
    return this.http.get<Documentrequest>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  create(dto: Documentrequest): Observable<Documentrequest> {
    const { id, ...payload } = dto as any;
    return this.http.post<Documentrequest>(this.apiUrl, payload, {
      headers: this.getAuthHeaders()
    });
  }

  update(id: number, dto: Documentrequest): Observable<Documentrequest> {
    return this.http.put<Documentrequest>(`${this.apiUrl}/${id}`, dto, {
      headers: this.getAuthHeaders()
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // ✅ FIX: now matches backend endpoint: PUT /api/DocumentRequest/{id}/status
  updateStatus(id: number, status: string): Observable<Documentrequest> {
    return this.http.put<Documentrequest>(
      `${this.apiUrl}/${id}/status`,
      { status },
      { headers: this.getAuthHeaders() }
    );
  }

  // optional: keep if some old code still uses it
  markReady(id: number): Observable<Documentrequest> {
    return this.http.put<Documentrequest>(
      `${this.apiUrl}/${id}/mark-ready`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }
}
