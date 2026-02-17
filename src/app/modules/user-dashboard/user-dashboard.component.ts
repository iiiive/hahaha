import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { UserDashboardService } from '../../core/services/user-dashboard.service';
import { BannerCarouselComponent } from '../../shared/banner-carousel/banner-carousel.component';

import { environment } from '../../environments/environment';
import { NotificationService, NotificationItem } from '../../core/services/notification.service';

type RecentItem = Record<string, any>;

type DashboardResponse = {
  donations: { count: number; totalAmount: number; recent: RecentItem[] };
  documents: { count: number; recent: RecentItem[] };
  scheduling: { count: number; recent: RecentItem[] };
};

type PanelKey = 'donations' | 'documents' | 'scheduling';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, BannerCarouselComponent],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss']
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  currentDate: string = new Date().toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  loading = false;
  error = '';

  limit = 5;

  open: Record<PanelKey, boolean> = {
    donations: false,
    documents: false,
    scheduling: false
  };

  activePanel: PanelKey = 'donations';

  @ViewChild('donationsList') donationsList?: ElementRef<HTMLDivElement>;
  @ViewChild('documentsList') documentsList?: ElementRef<HTMLDivElement>;
  @ViewChild('schedulingList') schedulingList?: ElementRef<HTMLDivElement>;

  data: DashboardResponse = {
    donations: { count: 0, totalAmount: 0, recent: [] },
    documents: { count: 0, recent: [] },
    scheduling: { count: 0, recent: [] }
  };

  displayName = '';

  banners: any[] = [];
  bannerUrls: string[] = [];

  // ✅ Notifications (Dashboard shows UNREAD ONLY)
  notifLoading = false;
  notifError = '';
  unreadCount = 0;
  notifications: NotificationItem[] = []; // UNREAD ONLY
  notifOpen = true;

  // ✅ UI-only: prevent double click spam
  markingNotifId: number | null = null;

  constructor(
    private auth: AuthService,
    private dashboard: UserDashboardService,
    private notifs: NotificationService
  ) {}

  ngOnInit(): void {
    this.displayName = this.getDisplayName();
    this.load();
    this.loadBanners();
    this.loadNotifications();
  }

  ngOnDestroy(): void {}

  private getDisplayName(): string {
    const anyAuth = this.auth as any;
    const me =
      (typeof anyAuth.getCurrentUser === 'function' ? anyAuth.getCurrentUser() : null) ||
      anyAuth.currentUserValue ||
      anyAuth.currentUser ||
      null;

    return me?.fullName || me?.name || me?.email || '';
  }

  get(obj: any, key: string): any {
    return obj?.[key];
  }

  // -------------------------
  // ✅ Notifications (NO AUTO-MARK READ)
  // -------------------------

  /** Safe read-check for any backend shape */
  private isNotifRead(n: any): boolean {
    if (!n) return false;

    // common shapes
    if (typeof n.isRead === 'boolean') return n.isRead;

    const raw = n.IsRead ?? n.read ?? n.Read;
    if (typeof raw === 'boolean') return raw;

    // allow 0/1
    if (raw === 1 || raw === '1') return true;
    if (raw === 0 || raw === '0') return false;

    return false;
  }

  loadNotifications(): void {
    this.notifLoading = true;
    this.notifError = '';

    this.notifs.getMy(30).subscribe({
      next: (res) => {
        const all = Array.isArray((res as any)?.items) ? (res as any).items : [];

        // ✅ Dashboard shows ONLY unread
        const unread = all.filter((x: any) => !this.isNotifRead(x));
        this.notifications = unread;

        // ✅ Keep badge consistent even if backend doesn't return unreadCount properly
        const serverUnread = Number((res as any)?.unreadCount ?? NaN);
        this.unreadCount = Number.isFinite(serverUnread) ? serverUnread : unread.length;
      },
      error: () => {
        this.notifError = 'Failed to load notifications.';
        this.unreadCount = 0;
        this.notifications = [];
      },
      complete: () => (this.notifLoading = false)
    });
  }

  markNotifRead(n: NotificationItem): void {
    if (!n) return;

    const id = (n as any).notificationId ?? (n as any).NotificationId;
    if (!id) return;

    if (this.markingNotifId === id) return;
    this.markingNotifId = id;

    this.notifs.markRead(id).subscribe({
      next: () => {
        // ✅ remove from dashboard list (unread-only)
        this.notifications = this.notifications.filter((x: any) => {
          const xid = x.notificationId ?? (x as any).NotificationId;
          return xid !== id;
        });

        this.unreadCount = Math.max(0, this.unreadCount - 1);
      },
      error: () => {},
      complete: () => {
        this.markingNotifId = null;
      }
    });
  }

  markAllNotificationsRead(): void {
    if (!(this.notifications?.length || 0)) return;

    this.notifs.markAllRead().subscribe({
      next: () => {
        // ✅ Dashboard should remove them (unread-only)
        this.notifications = [];
        this.unreadCount = 0;
      },
      error: () => {}
    });
  }

  trackByNotifId = (_: number, n: any) => n?.notificationId ?? n?.NotificationId ?? _;

  // -------------------------
  // ✅ Dashboard data
  // -------------------------
  load(): void {
    this.loading = true;
    this.error = '';

    this.dashboard.getMyDashboard().subscribe({
      next: (res: DashboardResponse) => {
        this.data = {
          donations: {
            count: Number(res?.donations?.count ?? 0),
            totalAmount: Number(res?.donations?.totalAmount ?? 0),
            recent: Array.isArray(res?.donations?.recent) ? res.donations.recent : []
          },
          documents: {
            count: Number(res?.documents?.count ?? 0),
            recent: Array.isArray(res?.documents?.recent) ? res.documents.recent : []
          },
          scheduling: {
            count: Number(res?.scheduling?.count ?? 0),
            recent: Array.isArray(res?.scheduling?.recent) ? res.scheduling.recent : []
          }
        };

        // ✅ default closed (kept)
        this.open = { donations: false, documents: false, scheduling: false };
      },
      error: (err: any) => {
        const msg =
          err?.error?.message ||
          err?.error?.title ||
          (typeof err?.error === 'string' ? err.error : '') ||
          err?.message ||
          'Failed to load your dashboard.';

        this.error = msg;
        this.data = {
          donations: { count: 0, totalAmount: 0, recent: [] },
          documents: { count: 0, recent: [] },
          scheduling: { count: 0, recent: [] }
        };
      },
      complete: () => (this.loading = false)
    });
  }

  /** ✅ Accordion: only one open at a time + still allows closing the same panel */
  toggle(panel: PanelKey): void {
    const willOpen = !this.open[panel];

    // ✅ close all first (forces only one open)
    this.open = { donations: false, documents: false, scheduling: false };

    // ✅ open the clicked one (or keep all closed if user is closing it)
    if (willOpen) {
      this.open[panel] = true;

      setTimeout(() => {
        this.activePanel = panel;
        this.getPanelElement(panel)?.focus();
      }, 0);
    }
  }

  private getPanelElement(panel: PanelKey): HTMLDivElement | null {
    if (panel === 'donations') return this.donationsList?.nativeElement ?? null;
    if (panel === 'documents') return this.documentsList?.nativeElement ?? null;
    if (panel === 'scheduling') return this.schedulingList?.nativeElement ?? null;
    return null;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    const isInsideScrollable =
      !!target && (target.closest?.('.fade-scroll') || target.classList?.contains('fade-scroll'));

    if (!isInsideScrollable) return;

    const el = this.getPanelElement(this.activePanel);
    if (!el) return;

    const step = 70;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      el.scrollBy({ top: step, behavior: 'smooth' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      el.scrollBy({ top: -step, behavior: 'smooth' });
    } else if (e.key === 'Home') {
      e.preventDefault();
      el.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (e.key === 'End') {
      e.preventDefault();
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }

  // -------------------------
  // ✅ BANNERS
  // -------------------------
  private loadBanners(): void {
    this.dashboard.getBanners().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
        this.banners = list;

        this.bannerUrls = this.banners
          .map(b => this.bannerSrc(b))
          .filter(u => !!u);
      },
      error: () => {
        this.banners = [];
        this.bannerUrls = [];
      }
    });
  }

  private bannerSrc(b: any): string {
    const url =
      this.get(b, 'fullUrl') ||
      this.get(b, 'FullUrl') ||
      this.get(b, 'url') ||
      this.get(b, 'Url');

    if (url) return String(url);

    const fileName = this.get(b, 'fileName') || this.get(b, 'FileName');
    if (!fileName) return '';

    return `${environment.imageUrl}/uploads/banners/${fileName}`;
  }

  fmtDate(value: any): string {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }

  donationTypeLabel(d: any): string {
    const type = this.get(d, 'donationType') ?? this.get(d, 'DonationType') ?? '';
    const custom = this.get(d, 'customDonationType') ?? this.get(d, 'CustomDonationType') ?? '';
    if (String(type).toLowerCase() === 'other' && custom) return String(custom);
    return String(type || 'Donation');
  }

  money(val: any): string {
    const n = Number(val);
    if (Number.isNaN(n)) return '0.00';
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
