import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
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
  @Output() toggleSidebar = new EventEmitter<void>();

  isLoggedIn = false;

  currentDate: Date = new Date();

  showModal = false;

  private sub?: Subscription;
  private timerId: any;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.refreshAuthState();

    this.timerId = setInterval(() => {
      this.currentDate = new Date();
    }, 30000);

    this.sub = this.authService.loggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;

      // do not auto-open modal
      if (!loggedIn) this.showModal = false;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.timerId) clearInterval(this.timerId);
  }

  private refreshAuthState(): void {
    this.isLoggedIn = this.authService.isAuthenticated();
    this.showModal = false;
  }

  // Keep these (safe), but NO logout button in header anymore
  openLoginModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.refreshAuthState();
  }

  onUserLoggedIn(): void {
    this.showModal = false;
    this.refreshAuthState();
  }
}
