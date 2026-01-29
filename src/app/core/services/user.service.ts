import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CreateUserDto } from '../../shared/models/create-user.dto';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) {}

  createUser(payload: CreateUserDto): Observable<any> {
    // ✅ Change endpoint to match your backend route
    return this.api.post('/users', payload);
  }
}
