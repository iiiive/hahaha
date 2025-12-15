import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Appointment {
  id?: number;
  type: string;
  title: string;
  dateTime: string;  // store as ISO string for backend
  contact: string;
  colorClass?: string;
  badgeClass?: string;
}

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  private apiUrl = 'http://localhost:3000/appointments'; // replace with your backend URL

  constructor(private http: HttpClient) { }

  getAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.apiUrl);
  }

  addAppointment(appt: Appointment): Observable<Appointment> {
    return this.http.post<Appointment>(this.apiUrl, appt);
  }

  updateAppointment(id: number, appt: Appointment): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.apiUrl}/${id}`, appt);
  }

  deleteAppointment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
