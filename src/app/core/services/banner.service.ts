import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface BannerItem {
  id: number;
  fileName: string;
  fullUrl: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class BannerService {
  private apiUrl = `${environment.apiUrl}/banners`; // ✅ /api/banners

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token || ''}`
    });
  }

  getBanners(): Observable<BannerItem[]> {
    return this.http.get<BannerItem[]>(this.apiUrl, { headers: this.getAuthHeaders() });
  }

  uploadBanner(file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);

    return this.http.post(`${this.apiUrl}/upload`, form, { headers: this.getAuthHeaders() });
  }

  deleteBanner(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }
}
