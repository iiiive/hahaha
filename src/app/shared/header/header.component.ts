import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { LoginComponent } from '../../modules/auth/login/login.component';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LoginComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  isAdmin = false;

  // template uses date pipe → keep Date type
  currentDate: Date = new Date();

  showModal = false;

  private sub?: Subscription;
  private timerId: any;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.refreshAuthState();

    // ✅ update header date every 30s
    this.timerId = setInterval(() => {
      this.currentDate = new Date();
    }, 30000);

    // ✅ listen for login/logout
    this.sub = this.authService.loggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.isAdmin = this.isRoleAdmin();

      // ✅ IMPORTANT: don’t auto-open modal (prevents blocking clicks on /register)
      if (!loggedIn) this.showModal = false;
    });
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
    if (this.timerId) clearInterval(this.timerId);
  }

  private refreshAuthState(): void {
    this.isLoggedIn = this.authService.isAuthenticated();
    this.isAdmin = this.isRoleAdmin();

    // ✅ do NOT force modal open automatically
    this.showModal = false;
  }

  private isRoleAdmin(): boolean {
    const role = this.authService.getRole();
    return (role || '').toLowerCase() === 'admin';
  }

  onLoginClick(): void {
    if (this.isLoggedIn) {
      this.logout();
    } else {
      this.showModal = true;
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.refreshAuthState();
  }

  logout(): void {
    this.authService.logout();
    this.refreshAuthState();
  }

  onUserLoggedIn(): void {
    this.showModal = false;
    this.refreshAuthState();
  }
}
