import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ServiceSchedule } from '../../shared/models/service-schedule';
import { ServiceScheduleRequirement } from '../../shared/models/service-schedule-requirement';

@Injectable({
  providedIn: 'root'
})
export class ServiceScheduleService {
  private apiUrl = `${environment.apiUrl}/ServiceSchedule`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  // ============ Main Schedule ============
  getAll(): Observable<ServiceSchedule[]> {
    return this.http.get<ServiceSchedule[]>(this.apiUrl, { headers: this.getAuthHeaders() });
  }

  getById(id: number, includeRequirements = false): Observable<ServiceSchedule> {
    return this.http.get<ServiceSchedule>(`${this.apiUrl}/${id}?includeRequirements=${includeRequirements}`, { headers: this.getAuthHeaders() });
  }

  create(dto: ServiceSchedule): Observable<ServiceSchedule> {
    return this.http.post<ServiceSchedule>(this.apiUrl, dto, { headers: this.getAuthHeaders() });
  }

  update(id: number, dto: ServiceSchedule): Observable<ServiceSchedule> {
    return this.http.put<ServiceSchedule>(`${this.apiUrl}/${id}`, dto, { headers: this.getAuthHeaders() });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  // ============ Requirements ============
  getRequirements(scheduleId: number): Observable<ServiceScheduleRequirement[]> {
    return this.http.get<ServiceScheduleRequirement[]>(`${this.apiUrl}/${scheduleId}/requirements`, { headers: this.getAuthHeaders() });
  }

  addRequirement(scheduleId: number, dto: ServiceScheduleRequirement): Observable<ServiceScheduleRequirement> {
    return this.http.post<ServiceScheduleRequirement>(`${this.apiUrl}/${scheduleId}/requirements`, dto, { headers: this.getAuthHeaders() });
  }

  deleteRequirement(scheduleId: number, reqId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${scheduleId}/requirements/${reqId}`, { headers: this.getAuthHeaders() });
  }

  uploadRequirement(scheduleId: number, file: File, requirementType: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('requirementType', requirementType);

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post<ServiceScheduleRequirement>(
      `${this.apiUrl}/${scheduleId}/requirements/upload`,
      formData,
      { headers }
    );
  }

}
