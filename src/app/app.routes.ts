import { Routes } from '@angular/router';
import { LoginComponent } from './modules/auth/login/login.component';

import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  // ✅ AUTH ONLY
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

  // ✅ PUBLIC REGISTER
  {
    path: 'register',
    loadComponent: () =>
      import('./modules/register/register.component').then((m) => m.RegisterComponent),
  },

  // ✅ USER DASHBOARD
  {
    path: 'user/dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/user-dashboard/user-dashboard.component').then(
        (m) => m.UserDashboardComponent
      ),
  },
  {
    path: 'user-dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/user-dashboard/user-dashboard.component').then(
        (m) => m.UserDashboardComponent
      ),
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
    path: 'users/create',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./modules/create-user/create-user.component').then((m) => m.CreateUserComponent),
  },
  {
    path: 'donations',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./modules/donations/donations.component').then((m) => m.DonationsComponent),
  },

  // ✅ SETTINGS
  {
    path: 'settings/profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/settings/profile-settings.component').then((m) => m.ProfileSettingsComponent),
  },
  {
    path: 'settings/password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/settings/change-password.component').then((m) => m.ChangePasswordComponent),
  },
 {
  path: 'settings/notifications',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./modules/settings/notification-preferences.component').then(
      (m) => m.NotificationPreferencesComponent
    ),
},
{
  path: 'settings/notifications-list',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./modules/settings/notifications.component').then(
      (m) => m.NotificationsComponent
    ),
},



  {
    path: 'settings/faqs',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/settings/faqs.component').then((m) => m.FaqsComponent),
  },
  {
    path: 'settings/contact-admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/settings/contact-admin.component').then((m) => m.ContactAdminComponent),
  },

  // ✅ USER BOOKMARKS
  {
    path: 'word-of-god/bookmarks',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/word-of-god/bookmarks.component').then((m) => m.BookmarksComponent),
  },

  // ✅ ADMIN AUDIT LOGS
  {
    path: 'admin/audit-logs',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./modules/admin/audit-logs.component').then((m) => m.AuditLogsComponent),
  },

  // ✅ ADMIN USERS (moved into admin tools sidebar)
  {
    path: 'admin/users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./modules/admin/admin-users/admin-users.component').then((m) => m.AdminUsersComponent),
  },
  {
    path: 'admin/users/pending',
    canActivate: [authGuard, adminGuard],
    data: { view: 'pending' },
    loadComponent: () =>
      import('./modules/admin/admin-users/admin-users.component').then((m) => m.AdminUsersComponent),
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
