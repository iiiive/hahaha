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

  // ✅ environment.apiUrl should be like: https://localhost:7006/api
  private apiUrl = `${environment.apiUrl}/ServiceSchedule`;

  constructor(private http: HttpClient) {}

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  // ✅ JSON headers ONLY for JSON requests (NOT for FormData uploads)
  private getAuthJsonHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  // ✅ Auth header ONLY (no Content-Type) for FormData uploads
  private getAuthOnlyHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  // ============ Main Schedule ============
  getAll(): Observable<ServiceSchedule[]> {
    return this.http.get<ServiceSchedule[]>(this.apiUrl, { headers: this.getAuthJsonHeaders() });
  }

  getById(id: number, includeRequirements = false): Observable<ServiceSchedule> {
    return this.http.get<ServiceSchedule>(
      `${this.apiUrl}/${id}?includeRequirements=${includeRequirements}`,
      { headers: this.getAuthJsonHeaders() }
    );
  }

  create(dto: ServiceSchedule): Observable<ServiceSchedule> {
    return this.http.post<ServiceSchedule>(this.apiUrl, dto, { headers: this.getAuthJsonHeaders() });
  }

  update(id: number, dto: ServiceSchedule): Observable<ServiceSchedule> {
    return this.http.put<ServiceSchedule>(`${this.apiUrl}/${id}`, dto, { headers: this.getAuthJsonHeaders() });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getAuthJsonHeaders() });
  }

  // ============ Requirements ============
  getRequirements(scheduleId: number): Observable<ServiceScheduleRequirement[]> {
    return this.http.get<ServiceScheduleRequirement[]>(
      `${this.apiUrl}/${scheduleId}/requirements`,
      { headers: this.getAuthJsonHeaders() }
    );
  }

  addRequirement(scheduleId: number, dto: ServiceScheduleRequirement): Observable<ServiceScheduleRequirement> {
    return this.http.post<ServiceScheduleRequirement>(
      `${this.apiUrl}/${scheduleId}/requirements`,
      dto,
      { headers: this.getAuthJsonHeaders() }
    );
  }

  deleteRequirement(scheduleId: number, reqId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${scheduleId}/requirements/${reqId}`,
      { headers: this.getAuthJsonHeaders() }
    );
  }

  // ✅ Upload requirement photo (Wedding etc.)
  uploadRequirement(scheduleId: number, file: File, requirementType: string): Observable<any> {
    const formData = new FormData();

    // ✅ Match your backend UploadRequirementDto: File + RequirementType
    formData.append('File', file);
    formData.append('RequirementType', requirementType);

    return this.http.post(
      `${this.apiUrl}/${scheduleId}/requirements/upload`,
      formData,
      { headers: this.getAuthOnlyHeaders() } // ✅ DO NOT set Content-Type
    );
  }
}
