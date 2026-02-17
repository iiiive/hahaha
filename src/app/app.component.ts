import { Component } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

import { HeaderComponent } from './shared/header/header.component';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    HeaderComponent,
    NavbarComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  sidebarOpen = false;

  // ✅ add ALL auth pages here
  private authRoutes = ['/login', '/register', '/create-account'];
  private currentUrl = '';

  // ✅ expose auth for template (fixes NG9 error)
  constructor(public router: Router, public authService: AuthService) {
    this.currentUrl = this.router.url;

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.sidebarOpen = false;
        this.currentUrl = e?.urlAfterRedirects || this.router.url;
      });
  }

  // ✅ Hide header/navbar/sidebar on auth pages
  isAuthPage(): boolean {
    const path = (this.currentUrl || this.router.url || '').split('?')[0];
    return this.authRoutes.some(r => path === r || path.startsWith(r + '/'));
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  isAdminAccess(): boolean {
    return this.authService.isAdmin();
  }

  // ✅ SuperAdmin-only checks for template
  isSuperAdminAccess(): boolean {
    return this.authService.isSuperAdmin();
  }

  logout(): void {
    this.sidebarOpen = false;
    this.authService.logout();
  }
}
