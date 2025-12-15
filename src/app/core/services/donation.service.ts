import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Amanu } from '../../shared/models/amanu';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AmanuService {

  private readonly apiUrl = `${environment.apiUrl}/Donation`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  // GET all
  getAll(): Observable<Amanu[]> {
    return this.http.get<Amanu[]>(this.apiUrl, { headers: this.getAuthHeaders() });
  }

  // GET by id
  getById(id: number): Observable<Amanu> {
    return this.http.get<Amanu>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  // POST create
  create(amanu: Partial<Amanu>): Observable<Amanu> {
    const { id, ...payload } = amanu;
    return this.http.post<Amanu>(this.apiUrl, payload, { headers: this.getAuthHeaders() });
  }

  // PUT update
  update(id: number, dto: Amanu): Observable<Amanu> {
    return this.http.put<Amanu>(`${this.apiUrl}/${id}`, dto, { headers: this.getAuthHeaders() });
  }


  // DELETE
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }
}
