import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NotificationService, NotificationItem } from '../../core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
  <main class="max-w-4xl mx-auto px-4 py-8">
    <div class="bg-white rounded-xl shadow p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Notifications</h2>
          <p class="text-sm text-gray-500">All notifications (read and unread)</p>
        </div>

        <div class="flex gap-2">
          <button class="pill" type="button" (click)="load()">Refresh</button>
          <button class="pill" type="button" (click)="markAll()" *ngIf="items.length">
            Mark all read
          </button>
        </div>
      </div>

      <div *ngIf="loading" class="text-sm text-gray-500">Loading...</div>
      <div *ngIf="error" class="text-sm text-red-600">{{ error }}</div>

      <div *ngIf="!loading && !error && !items.length" class="text-sm text-gray-500">
        No notifications yet.
      </div>

      <div *ngIf="!loading && items.length" class="space-y-3">
        <div *ngFor="let n of items"
             class="p-3 border rounded-lg flex items-start justify-between"
             [style.opacity]="n.isRead ? '0.75' : '1'">
          <div>
            <div class="font-semibold text-gray-800">{{ n.title }}</div>
            <div class="text-sm text-gray-600">{{ n.message }}</div>
            <div class="text-xs text-gray-400 mt-1">{{ fmtDate(n.createdAt) }}</div>
          </div>

          <button
            type="button"
            class="pill"
            (click)="markOne(n)"
            [style.background]="n.isRead ? '#E5E7EB' : '#7C3AED'"
            [style.color]="n.isRead ? '#111827' : '#fff'">
            {{ n.isRead ? 'Read' : 'Mark read' }}
          </button>
        </div>
      </div>
    </div>
  </main>
  `,
  styles: [`
    .pill{
      padding:6px 12px;
      border-radius:999px;
      border:1px solid #E5E7EB;
      background:#fff;
      font-size:12px;
      cursor:pointer;
    }
  `]
})
export class NotificationPreferencesComponent implements OnInit {
  loading = false;
  error = '';
  items: NotificationItem[] = [];

  constructor(private notifs: NotificationService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';

    this.notifs.getMy(100).subscribe({
      next: (res) => {
        this.items = Array.isArray(res?.items) ? res.items : [];
      },
      error: () => {
        this.error = 'Failed to load notifications.';
        this.items = [];
      },
      complete: () => (this.loading = false)
    });
  }

  markOne(n: NotificationItem): void {
    if (!n || n.isRead) return;

    this.notifs.markRead(n.notificationId).subscribe({
      next: () => (n.isRead = true),
      error: () => {}
    });
  }

  markAll(): void {
    this.notifs.markAllRead().subscribe({
      next: () => {
        this.items = this.items.map(x => ({ ...x, isRead: true }));
      },
      error: () => {}
    });
  }

  fmtDate(value: any): string {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }
}
