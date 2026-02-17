import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

export type BookmarkType = 'homily' | 'gospel';

export type BookmarkItem = {
  id: string; // unique key (e.g. "gospel:12" or "homily:5")
  type: BookmarkType;
  title: string;
  date?: string;
  verse?: string;
  preview?: string;
};

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  private baseKey = 'word_of_god_bookmarks_v1';
  private migratedFlagPrefix = 'word_of_god_bookmarks_migrated_v1';

  constructor(private auth: AuthService) {
    // Safe: migrate any old shared "guest" bookmarks to the current user once
    this.migrateGuestOnce();
  }

  // ✅ Block Admin/SuperAdmin (bookmarks for users only)
  canUseBookmarks(): boolean {
    // Your isAdmin() already returns true for SuperAdmin as well
    return !this.auth.isAdmin();
  }

  // ✅ Per-user storage key based on token user id
  private get storageKey(): string {
    const uid = this.auth.getUserId();
    const identity = uid || 'guest';
    return `${this.baseKey}__u_${identity}`;
  }

  getAll(): BookmarkItem[] {
    if (!this.canUseBookmarks()) return [];

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveAll(items: BookmarkItem[]): void {
    if (!this.canUseBookmarks()) return;
    localStorage.setItem(this.storageKey, JSON.stringify(this.dedupe(items)));
  }

  exists(type: BookmarkType, id: string): boolean {
    return this.getAll().some(x => x.type === type && x.id === id);
  }

  add(item: BookmarkItem): void {
    if (!this.canUseBookmarks()) return;

    const items = this.getAll();
    if (items.some(x => x.type === item.type && x.id === item.id)) return;

    items.unshift(item); // newest first
    this.saveAll(items);
  }

  remove(type: BookmarkType, id: string): void {
    if (!this.canUseBookmarks()) return;

    const items = this.getAll().filter(x => !(x.type === type && x.id === id));
    this.saveAll(items);
  }

  toggle(item: BookmarkItem): boolean {
    // returns true if SAVED, false if REMOVED
    if (!this.canUseBookmarks()) return false;

    if (this.exists(item.type, item.id)) {
      this.remove(item.type, item.id);
      return false;
    }
    this.add(item);
    return true;
  }

  clearAll(): void {
    if (!this.canUseBookmarks()) return;
    localStorage.removeItem(this.storageKey);
  }

  clearType(type: BookmarkType): void {
    if (!this.canUseBookmarks()) return;

    const items = this.getAll().filter(x => x.type !== type);
    this.saveAll(items);
  }

  // ----------------- helpers -----------------

  private dedupe(items: BookmarkItem[]): BookmarkItem[] {
    const seen = new Set<string>();
    const out: BookmarkItem[] = [];

    for (const it of items) {
      const k = `${it.type}|${it.id}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(it);
      }
    }

    return out;
  }

  /**
   * ✅ Optional safety migration:
   * If previously everything was stored under "guest", migrate it to the logged-in user's key once.
   * This prevents “lost bookmarks” after this fix.
   */
  private migrateGuestOnce(): void {
    try {
      if (!this.canUseBookmarks()) return;

      const uid = this.auth.getUserId();
      if (!uid) return;

      const flagKey = `${this.migratedFlagPrefix}__u_${uid}`;
      if (localStorage.getItem(flagKey) === '1') return;

      const oldGuestKey = `${this.baseKey}__u_guest`;
      const guestRaw = localStorage.getItem(oldGuestKey);
      if (!guestRaw) {
        localStorage.setItem(flagKey, '1');
        return;
      }

      const guestItems = JSON.parse(guestRaw);
      if (!Array.isArray(guestItems) || guestItems.length === 0) {
        localStorage.setItem(flagKey, '1');
        return;
      }

      const merged = this.dedupe([...guestItems, ...this.getAll()]);
      localStorage.setItem(this.storageKey, JSON.stringify(merged));

      // do NOT delete guest key (safe); just mark migrated
      localStorage.setItem(flagKey, '1');
    } catch {
      // ignore
    }
  }
}
