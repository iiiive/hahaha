// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './modules/auth/login/login.component';

// ✅ If you already have guards, keep yours and just use them here
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'documents',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/documents/documents.component').then((m) => m.DocumentsComponent),
  },
  {
    path: 'word-of-god',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/word-of-god/word-of-god.component').then((m) => m.WordOfGodComponent),
  },
  {
    path: 'scheduling',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/scheduling/scheduling.component').then((m) => m.SchedulingComponent),
  },

  // ✅ USER ONLY
  {
    path: 'online-giving',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/online-giving/online-giving.component').then(
        (m) => m.OnlineGivingComponent
      ),
  },

  // ✅ ADMIN ONLY
  {
    path: 'donations',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./modules/donations/donations.component').then((m) => m.DonationsComponent),
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
