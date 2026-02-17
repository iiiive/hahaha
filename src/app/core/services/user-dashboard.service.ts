import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UserDashboardService {
  constructor(private api: ApiService) {}

  getMyDashboard(): Observable<any> {
    return this.api.get<any>('dashboard/me');
  }

  // ✅ user history logs (collapsible section)
  getMyHistory(): Observable<any> {
    return this.api.get<any>('dashboard/me/history');
  }

  // ✅ carousel banners for user dashboard
  getBanners(): Observable<any> {
    return this.api.get<any>('dashboard/banners');
  }
}
