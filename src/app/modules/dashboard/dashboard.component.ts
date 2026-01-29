import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from '../auth/login/login.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import { AdminUserService, AdminUserRow } from '../../core/services/admin-user.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LoginComponent, HeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentDate: string = new Date().toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  isAdmin: boolean = false;

  // ✅ pending users only
  users: AdminUserRow[] = [];
  loadingUsers = false;
  usersError = '';

  constructor(
    private authService: AuthService,
    private adminUserService: AdminUserService
  ) {
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit(): void {
    if (this.isAdmin) this.loadPending();
  }

  loadPending() {
    this.loadingUsers = true;
    this.usersError = '';

    this.adminUserService.getPending().subscribe({
      next: (rows) => this.users = rows,
      error: (err) => {
        console.error('Load users error:', err);
        this.usersError = 'Failed to load users.';
        this.loadingUsers = false;
      },
      complete: () => this.loadingUsers = false
    });
  }

  approve(u: AdminUserRow) {
    this.adminUserService.approve(u.userId).subscribe({
      next: () => {
        // ✅ remove from pending immediately
        this.users = this.users.filter(x => x.userId !== u.userId);
      },
      error: (err) => {
        console.error(err);
        this.usersError = 'Failed to approve user.';
      }
    });
  }

  decline(u: AdminUserRow) {
    this.adminUserService.decline(u.userId).subscribe({
      next: () => {
        // ✅ remove from pending immediately
        this.users = this.users.filter(x => x.userId !== u.userId);
      },
      error: (err) => {
        console.error(err);
        this.usersError = 'Failed to decline user.';
      }
    });
  }

  roleName(roleId: number) {
    return roleId === 1 ? 'Admin' : 'User';
  }
}
