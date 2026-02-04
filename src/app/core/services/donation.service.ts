import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Donation } from '../../shared/models/donation';
import { CreateDonationDto } from '../../shared/models/create-donation.dto';

@Injectable({ providedIn: 'root' })
export class DonationService {
  private baseUrl = `${environment.apiUrl}/Donation`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Donation[]> {
    return this.http.get<Donation[]>(this.baseUrl);
  }

  getById(id: number): Observable<Donation> {
    return this.http.get<Donation>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateDonationDto): Observable<Donation> {
    return this.http.post<Donation>(this.baseUrl, dto);
  }

  // ✅ works now because backend PUT exists
  update(id: number, payload: any): Observable<Donation> {
    return this.http.put<Donation>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
