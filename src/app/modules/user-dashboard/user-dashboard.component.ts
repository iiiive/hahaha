import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { UserDashboardService } from '../../core/services/user-dashboard.service';

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
  imports: [CommonModule, RouterModule],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss']
})
export class UserDashboardComponent implements OnInit {
  currentDate: string = new Date().toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  loading = false;
  error = '';

  // ✅ used only for showing/hiding the "View All" button
  limit = 5;

  // ✅ "View All" now expands height ONLY (items are never hidden)
  expanded: Record<PanelKey, boolean> = {
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

  constructor(
    private auth: AuthService,
    private dashboard: UserDashboardService
  ) {}

  ngOnInit(): void {
    this.displayName = this.getDisplayName();
    this.load();
  }

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

  toggleViewAll(panel: PanelKey): void {
    this.expanded[panel] = !this.expanded[panel];

    // focus list after toggle so arrows work immediately
    setTimeout(() => {
      this.getPanelElement(panel)?.focus();
    }, 0);
  }

  private getPanelElement(panel: PanelKey): HTMLDivElement | null {
    if (panel === 'donations') return this.donationsList?.nativeElement ?? null;
    if (panel === 'documents') return this.documentsList?.nativeElement ?? null;
    return this.schedulingList?.nativeElement ?? null;
  }

  // ✅ Keyboard scroll support inside focused list
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
