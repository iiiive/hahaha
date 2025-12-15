import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoginComponent } from '../auth/login/login.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { AuthService } from '../../core/services/auth.service';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LoginComponent, HeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  currentDate: string = new Date().toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  loginMessageClass = '';
  currentUser: User | null = null;
  isAdmin: boolean = false;

  constructor(private authService: AuthService) {
    this.isAdmin = this.authService.isAdmin();
  }

  private loadUser() {
    try {
      this.currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch {
      this.currentUser = null;
    }
  }

  private setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
}
