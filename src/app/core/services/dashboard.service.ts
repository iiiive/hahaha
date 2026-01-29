import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}

  getMyDashboard(): Observable<any> {
    return this.api.get<any>('dashboard/me');
  }
}
