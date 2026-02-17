import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';

// ✅ FIXED PATH (based on your screenshot)
import { BannerCarouselComponent } from '../../../shared/banner-carousel/banner-carousel.component';

type UserRow = {
  userId: number;
  fullName: string;
  email: string;
  roleId: number;
  createdAt: string;
  isApproved: boolean;
  status: string;
};

type ViewMode = 'all' | 'pending';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, BannerCarouselComponent],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  loading = false;

  isSuperAdmin = false;
  isAdmin = false;

  viewMode: ViewMode = 'all';
  activeTab: 'users' | 'admins' = 'users';

  all: UserRow[] = [];
  users: UserRow[] = [];
  admins: UserRow[] = [];

  // ==========================
  // ✅ BANNERS (review before upload)
  // ==========================
  bannerUrls: string[] = [];
  bannerLoading = false;

  // ✅ FIX: this must exist because template uses it
  bannerError: string | null = null;

  uploadingBanner = false;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private toastr: ToastrService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.auth.isSuperAdmin();
    this.isAdmin = this.auth.isAdmin?.() ?? false;

    const v = this.route.snapshot.data?.['view'];
    this.viewMode = v === 'pending' ? 'pending' : 'all';

    this.load();

    // ✅ show banners only in /admin/users (all) AND only for Admin/SuperAdmin
    if (this.viewMode === 'all' && (this.isSuperAdmin || this.isAdmin)) {
      this.loadBanners();
    }
  }

  // ==========================
  // ✅ USERS (existing logic)
  // ==========================
  load(): void {
    this.loading = true;

    const endpoint = this.viewMode === 'pending'
      ? 'admin/users/pending'
      : 'admin/users';

    this.api.get<any[]>(endpoint).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : [];

        this.all = list.map(x => ({
          userId: Number(x.userId ?? x.UserId),
          fullName: String(x.fullName ?? x.FullName ?? ''),
          email: String(x.email ?? x.Email ?? ''),
          roleId: Number(x.roleId ?? x.RoleId ?? 0),
          createdAt: String(x.createdAt ?? x.CreatedAt ?? ''),
          isApproved: Boolean(x.isApproved ?? x.IsApproved),
          status: String(x.status ?? x.Status ?? '')
        }));

        this.users = this.all.filter(x => x.roleId === 2);
        this.admins = this.all.filter(x => x.roleId === 1);

        if (this.isSuperAdmin) this.activeTab = 'users';

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Failed to load users.');
      }
    });
  }

  statusLower(u: UserRow): string {
    return (u.status || '').toLowerCase();
  }

  roleLabel(roleId: number): string {
    if (roleId === 3) return 'SuperAdmin';
    if (roleId === 1) return 'Admin';
    return 'User';
  }

  // ✅ SuperAdmin ONLY
  approve(u: UserRow): void {
    if (!this.isSuperAdmin) {
      this.toastr.error('Only SuperAdmin can approve users.');
      return;
    }

    this.loading = true;
    this.api.put(`admin/users/${u.userId}/approve`, {}).subscribe({
      next: () => {
        this.toastr.success('Approved.');
        this.load();
      },
      error: (e) => {
        this.loading = false;
        this.toastr.error(e?.error?.message || 'Approve failed.');
      }
    });
  }

  // ✅ SuperAdmin ONLY
  decline(u: UserRow): void {
    if (!this.isSuperAdmin) {
      this.toastr.error('Only SuperAdmin can decline users.');
      return;
    }

    if (!confirm('Decline and delete this account?')) return;

    this.loading = true;
    this.api.put(`admin/users/${u.userId}/decline`, {}).subscribe({
      next: () => {
        this.toastr.success('Declined & deleted.');
        this.load();
      },
      error: (e) => {
        this.loading = false;
        this.toastr.error(e?.error?.message || 'Decline failed.');
      }
    });
  }

  deactivate(u: UserRow): void {
    if (!this.isSuperAdmin) {
      this.toastr.error('Only SuperAdmin can deactivate accounts.');
      return;
    }

    if (!confirm('Deactivate this account?')) return;

    this.loading = true;
    this.api.put(`admin/users/${u.userId}/deactivate`, {}).subscribe({
      next: () => {
        this.toastr.success('Account deactivated.');
        this.load();
      },
      error: (e) => {
        this.loading = false;
        this.toastr.error(e?.error?.message || 'Deactivate failed.');
      }
    });
  }

  reactivate(u: UserRow): void {
    if (!this.isSuperAdmin) {
      this.toastr.error('Only SuperAdmin can reactivate accounts.');
      return;
    }

    if (!confirm('Reactivate this account?')) return;

    this.loading = true;
    this.api.put(`admin/users/${u.userId}/reactivate`, {}).subscribe({
      next: () => {
        this.toastr.success('Account reactivated.');
        this.load();
      },
      error: (e) => {
        this.loading = false;
        this.toastr.error(e?.error?.message || 'Reactivate failed.');
      }
    });
  }

  invite(u: UserRow): void {
    this.loading = true;
    this.api.post(`admin/users/${u.userId}/donation-invite`, {}).subscribe({
      next: () => {
        this.toastr.success('Invite sent.');
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.toastr.error(e?.error?.message || 'Invite failed.');
      }
    });
  }

  inviteAllUsers(): void {
    if (!confirm('Send donation invite to all approved users?')) return;

    this.loading = true;
    this.api.post(`admin/users/donation-invite-all`, {}).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || 'Invites sent.');
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.toastr.error(e?.error?.message || 'Invite all failed.');
      }
    });
  }

  // ==========================
  // ✅ BANNERS
  // ==========================
  loadBanners(): void {
    this.bannerLoading = true;
    this.bannerError = null;

    this.api.get<any[]>('Banners').subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : [];
        this.bannerUrls = list
          .map(x => this.resolveBannerUrl(x))
          .filter(Boolean) as string[];

        this.bannerLoading = false;
      },
      error: (e) => {
        this.bannerLoading = false;
        this.bannerError = e?.error?.message || 'Failed to load banners.';
      }
    });
  }

  // called by (uploadConfirmed) after REVIEW
  uploadBannerFile(file: File): void {
    if (!(this.isSuperAdmin || this.isAdmin)) {
      this.toastr.error('Admins only.');
      return;
    }
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);

    this.uploadingBanner = true;

    this.api.post<any>('Banners/upload', fd).subscribe({
      next: () => {
        this.toastr.success('Banner uploaded.');
        this.uploadingBanner = false;
        this.loadBanners();
      },
      error: (e) => {
        this.uploadingBanner = false;
        this.toastr.error(e?.error?.message || 'Upload failed.');
      }
    });
  }

  private resolveBannerUrl(x: any): string | null {
    const base = String((this.api as any)?.base || '').replace(/\/+$/, '');

    const raw =
      x?.url ??
      x?.fileUrl ??
      x?.imageUrl ??
      x?.path ??
      x?.filePath ??
      null;

    const fileName = x?.fileName ?? x?.FileName ?? null;

    if (typeof raw === 'string' && /^https?:\/\//i.test(raw)) return raw;

    if (typeof raw === 'string' && raw.trim()) {
      const p = raw.trim().replace(/^\/+/, '');
      return base ? `${base}/${p}` : `/${p}`;
    }

    if (typeof fileName === 'string' && fileName.trim()) {
      return base ? `${base}/uploads/banners/${encodeURIComponent(fileName.trim())}` : null;
    }

    return null;
  }
}
