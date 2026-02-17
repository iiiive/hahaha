import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

type ApiOptions = {
  params?: HttpParams;
  headers?: HttpHeaders;
  /** default true: attach Bearer token if available */
  auth?: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private withAuthHeaders(options?: ApiOptions): { params?: HttpParams; headers?: HttpHeaders } {
    const auth = options?.auth !== false; // default TRUE
    const token = this.getToken();

    let headers = options?.headers ?? new HttpHeaders();

    // ✅ only attach when requested and token exists
    if (auth && token) {
      // don't double-set if already provided
      if (!headers.has('Authorization')) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return {
      params: options?.params,
      headers
    };
  }

  get<T>(path: string, options?: ApiOptions): Observable<T> {
    return this.http.get<T>(`${this.base}/${path}`, this.withAuthHeaders(options));
  }

  post<T>(path: string, body: any, options?: ApiOptions): Observable<T> {
    return this.http.post<T>(`${this.base}/${path}`, body, this.withAuthHeaders(options));
  }

  put<T>(path: string, body: any, options?: ApiOptions): Observable<T> {
    return this.http.put<T>(`${this.base}/${path}`, body, this.withAuthHeaders(options));
  }

  delete<T>(path: string, options?: ApiOptions): Observable<T> {
    return this.http.delete<T>(`${this.base}/${path}`, this.withAuthHeaders(options));
  }
}
