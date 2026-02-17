import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AuditLog } from '../../shared/models/auditlog';
import { AuditLogService, AuditModule } from '../../core/services/audit-log.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-audit-logs',
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs.component.html',
  styleUrls: ['./audit-logs.component.scss']
})
export class AuditLogsComponent implements OnInit, OnDestroy {
  logs: AuditLog[] = [];
  loading = false;

  // filters
  module: AuditModule = 'All';
  adminUserId: number | null = null;
  from: string | null = null; // yyyy-mm-dd
  to: string | null = null;

  adminIdInput = '';

  // internal scroll
  @ViewChild('logScroll') logScroll?: ElementRef<HTMLElement>;
  scrollAtTop = true;
  scrollAtBottom = false;

  private resizeObserver?: ResizeObserver;

  constructor(
    private auditSvc: AuditLogService,
    private authSvc: AuthService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    if (!this.authSvc.isAdmin()) {
      this.toastr.warning('Admins only.');
      return;
    }

    this.load();
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    try { this.resizeObserver?.disconnect(); } catch {}
  }

  // ✅ SAFE: if AuthService has isSuperAdmin(), use it; else false
  get isSuperAdmin(): boolean {
    const anyAuth: any = this.authSvc as any;
    return typeof anyAuth.isSuperAdmin === 'function' ? !!anyAuth.isSuperAdmin() : false;
  }

  load(): void {
    this.loading = true;

    const parsedAdminId = this.adminIdInput?.trim()
      ? Number(this.adminIdInput.trim())
      : null;

    this.adminUserId = Number.isFinite(parsedAdminId as any) ? parsedAdminId : null;

    this.auditSvc.getLogs({
      module: this.module,
      adminUserId: this.adminUserId,
      from: this.from,
      to: this.to
    }).subscribe({
      next: (data) => {
        this.logs = [...(data || [])].sort((a, b) =>
          new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
        );
        this.loading = false;
        setTimeout(() => this.onScroll(), 0);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.toastr.error('Failed to load audit logs.');
      }
    });
  }

  clearFilters(): void {
    this.module = 'All';
    this.adminIdInput = '';
    this.adminUserId = null;
    this.from = null;
    this.to = null;
    this.load();
  }

  clearLogs(): void {
    if (!this.isSuperAdmin) {
      this.toastr.warning('SuperAdmin only.');
      return;
    }

    this.auditSvc.clearLogs().subscribe({
      next: (res) => {
        this.toastr.success(`Cleared ${res?.deleted ?? 0} audit logs.`);
        this.logs = [];
        setTimeout(() => this.onScroll(), 0);
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Failed to clear audit logs.');
      }
    });
  }

  formatWhen(dt: string): string {
    try { return new Date(dt).toLocaleString(); } catch { return dt; }
  }

  badgeClass(entity: string): string {
  const e = (entity || '').toLowerCase();
  if (e.includes('schedule')) return 'badge badge-purple';
  if (e.includes('document')) return 'badge badge-indigo';
  if (e.includes('donation')) return 'badge badge-green';
  if (e.includes('wordofgod')) return 'badge badge-purple'; // ✅ added
  return 'badge badge-gray';
}


  displayActor(l: AuditLog): string {
    const name = (l.performedByName || '').trim();
    if (name) return name;

    if (l.performedByUserId != null) return `UserId: ${l.performedByUserId}`;
    return 'Unknown';
  }

  onScroll(): void {
    const el = this.logScroll?.nativeElement;
    if (!el) return;

    const top = el.scrollTop;
    const max = el.scrollHeight - el.clientHeight;

    this.scrollAtTop = top <= 1;
    this.scrollAtBottom = max <= 1 ? true : top >= (max - 1);
  }

  private setupResizeObserver(): void {
    const el = this.logScroll?.nativeElement;
    if (el && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.onScroll());
      this.resizeObserver.observe(el);
    }
  }
}
