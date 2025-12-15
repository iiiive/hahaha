import { Routes } from '@angular/router';
import { LoginComponent } from './modules/auth/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', loadComponent: () => import('./modules/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'documents', loadComponent: () => import('./modules/documents/documents.component').then(m => m.DocumentsComponent) },
  { path: 'word-of-god', loadComponent: () => import('./modules/word-of-god/word-of-god.component').then(m => m.WordOfGodComponent) },
  { path: 'scheduling', loadComponent: () => import('./modules/scheduling/scheduling.component').then(m => m.SchedulingComponent) },
  //{ path: 'donations', loadComponent: () => import('./modules/donations/donations.component').then(m => m.DonationsComponent) },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
