import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from '../auth/login/login.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import { AdminUserService, AdminUserRow } from '../../core/services/admin-user.service';
import {
  DashboardService,
  AdminTodayUpdatesResponse,
  AdminTodayDonation,
  AdminTodaySchedule,
  AdminTodayDocument
} from '../../core/services/dashboard.service';

// ✅ FIXED PATH (dashboard -> shared)
import { BannerCarouselComponent } from '../../shared/banner-carousel/banner-carousel.component';

import { BannerService, BannerItem } from '../../core/services/banner.service';

type TodayItemType = 'Donation' | 'Scheduling' | 'Documents';
type TodayFilter = 'All' | TodayItemType;

interface TodayItem {
  type: TodayItemType;
  createdAt: string;
  title: string;
  userId: number | null;
  userFullName: string | null;
  donorDisplayName?: string | null;
  entityId: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LoginComponent, HeaderComponent, BannerCarouselComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentDate: string = new Date().toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  role: 'User' | 'Admin' | 'SuperAdmin' | '' = '';
  isSuperAdmin = false;
  isAdmin = false;

  users: AdminUserRow[] = [];
  loadingUsers = false;
  usersError = '';

  todayLoading = false;
  todayError = '';
  todayItems: TodayItem[] = [];
  todayFilter: TodayFilter = 'All';
  private todayRaw: AdminTodayUpdatesResponse | null = null;

  // ✅ BANNERS
  banners: BannerItem[] = [];
  bannerUrls: string[] = [];
  bannerLoading = false;
  bannerError = '';
  bannerUploading = false;
  bannerUploadMsg = '';
  bannerUploadErr = '';
  bannerDeletingId: number | null = null;

  constructor(
    private authService: AuthService,
    private adminUserService: AdminUserService,
    private dashboardService: DashboardService,
    private bannerService: BannerService
  ) {}

  ngOnInit(): void {
    this.role = this.authService.getNormalizedRole();
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.isAdmin = (this.authService as any)?.isAdmin?.() ?? this.role === 'Admin';

    if (this.canSeeTodayUpdates) {
      this.loadBanners();
      this.refreshToday();
    }

    if (this.isSuperAdmin) this.loadPending();
  }

  get canSeeTodayUpdates(): boolean {
    return this.role === 'Admin' || this.role === 'SuperAdmin';
  }

  // ✅ Admin + SuperAdmin can manage banners
  get canManageBanners(): boolean {
    return this.role === 'Admin' || this.role === 'SuperAdmin';
  }

  get filteredTodayItems(): TodayItem[] {
    if (this.todayFilter === 'All') return this.todayItems;
    return this.todayItems.filter(x => x.type === this.todayFilter);
  }

  setTodayFilter(v: TodayFilter): void {
    this.todayFilter = v;
  }

  // =========================
  // ✅ BANNERS
  // =========================
  loadBanners(): void {
    this.bannerLoading = true;
    this.bannerError = '';

    this.bannerService.getBanners().subscribe({
      next: (items) => {
        this.banners = items || [];
        this.bannerUrls = this.banners.map(x => x.fullUrl);
      },
      error: (err: unknown) => {
        console.error('Banner load error:', err);
        this.banners = [];
        this.bannerUrls = [];
        this.bannerError = 'Failed to load banners.';
      },
      complete: () => (this.bannerLoading = false)
    });
  }

  // ✅ Upload from carousel review modal
  uploadBannerFile(file: File): void {
    if (!this.canManageBanners) return;
    if (!file) return;

    this.bannerUploadMsg = '';
    this.bannerUploadErr = '';
    this.bannerUploading = true;

    this.bannerService.uploadBanner(file).subscribe({
      next: () => {
        this.bannerUploadMsg = 'Banner uploaded!';
        this.loadBanners();
      },
      error: (err: any) => {
        console.error('Banner upload error:', err);
        this.bannerUploadErr = err?.error?.message || err?.error || 'Upload failed.';
      },
      complete: () => (this.bannerUploading = false)
    });
  }

  deleteBanner(id: number): void {
    if (!this.canManageBanners) return;

    this.bannerDeletingId = id;
    this.bannerError = '';

    this.bannerService.deleteBanner(id).subscribe({
      next: () => {
        this.banners = this.banners.filter(x => x.id !== id);
        this.bannerUrls = this.banners.map(x => x.fullUrl);
      },
      error: (err: any) => {
        console.error('Banner delete error:', err);
        this.bannerError = err?.error?.message || err?.error || 'Failed to delete banner.';
      },
      complete: () => (this.bannerDeletingId = null)
    });
  }

  // =========================
  // ✅ TODAY UPDATES
  // =========================
  refreshToday(): void {
    this.todayLoading = true;
    this.todayError = '';
    this.todayItems = [];

    this.dashboardService.getAdminTodayUpdates().subscribe({
      next: (data: AdminTodayUpdatesResponse) => {
        this.todayRaw = data;
        this.todayItems = this.buildTodayItems(data);
      },
      error: (err: unknown) => {
        console.error('Today updates error:', err);
        this.todayError = 'Failed to load today updates.';
        this.todayRaw = null;
        this.todayItems = [];
      },
      complete: () => (this.todayLoading = false)
    });
  }

  private buildTodayItems(data: AdminTodayUpdatesResponse): TodayItem[] {
    const items: TodayItem[] = [];

    (data?.donations || []).forEach((d: AdminTodayDonation) => {
      const titleParts: string[] = [];
      titleParts.push(`Donation #${d.donationId}`);
      if (d.donationType) titleParts.push(d.donationType);
      if (d.customDonationType) titleParts.push(`(${d.customDonationType})`);
      titleParts.push(`₱${Number(d.amount || 0).toLocaleString()}`);

      items.push({
        type: 'Donation',
        createdAt: d.createdAt,
        title: titleParts.join(' '),
        userId: d.userId ?? null,
        userFullName: d.userFullName ?? null,
        donorDisplayName: d.donorDisplayName ?? null,
        entityId: d.donationId
      });
    });

    (data?.schedules || []).forEach((s: AdminTodaySchedule) => {
      const title = `Schedule #${s.id} • ${this.cap(s.serviceType)} • ${s.status ?? ''}`.trim();
      items.push({
        type: 'Scheduling',
        createdAt: s.createdAt,
        title,
        userId: s.userId ?? null,
        userFullName: s.userFullName ?? null,
        entityId: s.id
      });
    });

    (data?.documents || []).forEach((r: AdminTodayDocument) => {
      const title = `Document #${r.id} • ${r.documentType} • ${r.status ?? ''}`.trim();
      items.push({
        type: 'Documents',
        createdAt: r.createdAt,
        title,
        userId: r.userId ?? null,
        userFullName: r.userFullName ?? null,
        entityId: r.id
      });
    });

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  badgeClass(type: TodayItemType): string {
    if (type === 'Donation') return 'pill pill-green';
    if (type === 'Scheduling') return 'pill pill-purple';
    return 'pill pill-indigo';
  }

  displayName(it: TodayItem): string {
    const donor = (it.donorDisplayName || '').trim();
    if (donor) return donor;

    const full = (it.userFullName || '').trim();
    if (full) return full;

    if (it.userId != null) return `UserId: ${it.userId}`;
    return 'Unknown';
  }

  formatWhen(dt: string): string {
    try { return new Date(dt).toLocaleString(); } catch { return dt; }
  }

  private cap(v: string | null | undefined): string {
    const s = (v || '').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  // =========================
  // SuperAdmin Approvals (unchanged)
  // =========================
  loadPending() {
    this.loadingUsers = true;
    this.usersError = '';

    this.adminUserService.getPending().subscribe({
      next: (rows: AdminUserRow[]) => (this.users = rows),
      error: (err: unknown) => {
        console.error('Load users error:', err);
        this.usersError = 'Failed to load users.';
        this.loadingUsers = false;
      },
      complete: () => (this.loadingUsers = false)
    });
  }

  approve(u: AdminUserRow) {
    this.adminUserService.approve(u.userId).subscribe({
      next: () => (this.users = this.users.filter(x => x.userId !== u.userId)),
      error: (err: unknown) => {
        console.error(err);
        this.usersError = 'Failed to approve user.';
      }
    });
  }

  decline(u: AdminUserRow) {
    this.adminUserService.decline(u.userId).subscribe({
      next: () => (this.users = this.users.filter(x => x.userId !== u.userId)),
      error: (err: unknown) => {
        console.error(err);
        this.usersError = 'Failed to decline user.';
      }
    });
  }

  roleName(roleId: number) {
    if (roleId === 1) return 'Admin';
    if (roleId === 3) return 'SuperAdmin';
    return 'User';
  }
}
