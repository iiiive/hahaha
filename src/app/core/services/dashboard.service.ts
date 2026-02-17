import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface AdminTodayDonation {
  donationId: number;
  userId: number | null;
  userFullName: string | null;
  donorDisplayName: string | null;
  donationType: string;
  customDonationType: string | null;
  amount: number;
  referenceNo: string | null;
  createdAt: string;
}

export interface AdminTodaySchedule {
  id: number;
  userId: number | null;
  userFullName: string | null;
  serviceType: string;
  serviceDate: string | null;
  serviceTime: string | null;
  status: string | null;
  createdAt: string;
}

export interface AdminTodayDocument {
  id: number;
  userId: number | null;
  userFullName: string | null;
  documentType: string;
  numberOfCopies: number;
  status: string | null;
  createdAt: string;
}

export interface AdminTodayUpdatesResponse {
  manilaDate: string;
  totals: { donations: number; schedules: number; documents: number };
  donations: AdminTodayDonation[];
  schedules: AdminTodaySchedule[];
  documents: AdminTodayDocument[];
}

export interface MyRecentDonation {
  donationId: number;
  donationType: string;
  customDonationType: string | null;
  amount: number;
  referenceNo: string | null;
  createdAt: string;
}

export interface MyRecentDocument {
  id: number;
  documentType: string;
  numberOfCopies: number;
  status: string;
  createdAt: string;
}

export interface MyRecentSchedule {
  id: number;
  serviceType: string;
  serviceDate: string | null;
  serviceTime: string | null;
  status: string;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: number | null;
  createdAt: string;
}

export interface MyDashboardResponse {
  emailUsed: string;
  donations: { count: number; totalAmount: number; recent: MyRecentDonation[] };
  documents: { count: number; recent: MyRecentDocument[] };
  scheduling: { count: number; recent: MyRecentSchedule[] };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  // ✅ Admin/SuperAdmin
  getAdminTodayUpdates(): Observable<AdminTodayUpdatesResponse> {
    return this.http.get<AdminTodayUpdatesResponse>(
      `${this.apiUrl}/dashboard/admin/today`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ✅ User
  getMyDashboard(): Observable<MyDashboardResponse> {
    return this.http.get<MyDashboardResponse>(
      `${this.apiUrl}/dashboard/me`,
      { headers: this.getAuthHeaders() }
    );
  }
}
