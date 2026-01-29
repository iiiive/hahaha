import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './shared/header/header.component';
import { NavbarComponent } from './shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,        // ✅ REQUIRED for *ngIf
    RouterOutlet,
    HeaderComponent,
    NavbarComponent
  ],
  template: `
    <!-- Hide header & navbar ONLY on login page -->
    <app-header *ngIf="!isLoginPage()"></app-header>
    <app-navbar *ngIf="!isLoginPage()"></app-navbar>

    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  constructor(private router: Router) {}

  isLoginPage(): boolean {
    return this.router.url === '/login';
  }
}
