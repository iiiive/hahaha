import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Documentrequest } from '../../shared/models/documentrequest';

@Injectable({
  providedIn: 'root'
})
export class DocumentRequestService {

  private apiUrl = `${environment.apiUrl}/DocumentRequest`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  getAll(): Observable<Documentrequest[]> {
    return this.http.get<Documentrequest[]>(this.apiUrl, { headers: this.getAuthHeaders() });
  }

  getById(id: number): Observable<Documentrequest> {
    return this.http.get<Documentrequest>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  create(dto: Documentrequest): Observable<Documentrequest> {
    const { id, ...payload } = dto;
    return this.http.post<Documentrequest>(this.apiUrl, payload, { headers: this.getAuthHeaders() });
  }

  update(id: number, dto: Documentrequest): Observable<Documentrequest> {
    return this.http.put<Documentrequest>(`${this.apiUrl}/${id}`, dto, { headers: this.getAuthHeaders() });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }
}
