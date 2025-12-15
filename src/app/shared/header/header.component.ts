import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { LoginComponent } from '../../modules/auth/login/login.component';
import { AuthService } from '../../core/services/auth.service';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LoginComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  isLoggedIn = false;
  isAdmin = false;
  currentDate = new Date();
  showModal = false;

  constructor(private authService: AuthService, private cdr: ChangeDetectorRef) {
    // Initial state
    this.isLoggedIn = this.authService.isAuthenticated();
    this.isAdmin = this.authService.getRole() === 'Admin';
    this.showModal = !this.isLoggedIn; // show login modal initially if not logged in

    // Subscribe to login/logout changes
    this.authService.loggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
      this.isAdmin = this.authService.getRole() === 'admin';

      // Show modal automatically when user logs out
      this.showModal = !loggedIn;

      this.cdr.detectChanges(); // ensure template updates
    });
  }

  // Show/hide login modal
  onLoginClick() {
    if (this.isLoggedIn) {
      this.logout();
    } else {
      this.showModal = true;
    }
  }

  closeModal() {
    this.showModal = false;
    this.updateLoginStatus(); // refresh after login
  }

  // Logout user
  logout() {
    this.authService.logout(); // removes token & role    
  }

  // Check login & role status
  updateLoginStatus() {
    this.isLoggedIn = this.authService.isAuthenticated();
    this.isAdmin = this.authService.getRole() === 'admin';
  }

  onUserLoggedIn() {
    this.showModal = false;
    this.updateLoginStatus(); // refresh isLoggedIn & isAdmin

    // Force template update
    this.cdr.detectChanges();
  }
}
