import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { BookmarkItem, BookmarkService } from '../../core/services/bookmark.service';

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [CommonModule],
  template: `
  <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
    <section>
      <h2 class="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
        Bookmarks
      </h2>

      <div *ngIf="!canUseBookmarks" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        Bookmarks are available for users only.
      </div>

      <!-- Tabs -->
      <div class="w-full flex justify-center mb-6" *ngIf="canUseBookmarks">
        <div class="inline-flex items-center gap-2 bg-white/70 border border-purple-200 rounded-2xl p-2 shadow-sm">
          <button
            type="button"
            (click)="activeTab = 'homilies'"
            class="px-4 py-2 rounded-xl text-sm font-semibold transition"
            [ngClass]="activeTab === 'homilies'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-transparent'"
          >
            📘 Homilies
            <span *ngIf="homilyItems.length > 0"
              class="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
              [ngClass]="activeTab === 'homilies' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'">
              {{ homilyItems.length }}
            </span>
          </button>

          <button
            type="button"
            (click)="activeTab = 'gospels'"
            class="px-4 py-2 rounded-xl text-sm font-semibold transition"
            [ngClass]="activeTab === 'gospels'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-transparent'"
          >
            ✝️ Gospel Readings
            <span *ngIf="gospelItems.length > 0"
              class="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
              [ngClass]="activeTab === 'gospels' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'">
              {{ gospelItems.length }}
            </span>
          </button>
        </div>
      </div>

      <!-- Main Panel -->
      <div *ngIf="canUseBookmarks" class="bg-white/90 rounded-xl card-shadow p-4 md:p-6 border border-purple-200">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
          <div>
            <h3 class="text-lg md:text-xl font-semibold text-gray-800">
              {{ activeTab === 'homilies' ? 'Homilies Collection' : 'Gospel Readings' }}
            </h3>
            <p class="text-sm text-gray-500">
              Your saved {{ activeTab === 'homilies' ? 'Homilies' : 'Gospel Readings' }}.
            </p>
          </div>

          <button
            *ngIf="currentItems.length > 0"
            type="button"
            (click)="clearTab()"
            class="w-full md:w-auto px-4 py-2 rounded-md border bg-white hover:bg-gray-50 text-sm font-semibold"
          >
            Clear {{ activeTab === 'homilies' ? 'Homilies' : 'Gospels' }}
          </button>
        </div>

        <!-- List -->
        <div class="space-y-4" *ngIf="currentItems.length > 0; else emptyState">
          <div
            *ngFor="let b of currentItems"
            class="p-4 border border-purple-100 rounded-lg shadow-sm hover:bg-purple-50/40 transition"
          >
            <div class="flex justify-between items-start gap-3 mb-3">
              <div>
                <h4 class="text-lg font-semibold text-gray-800">
                  {{ b.title }}
                </h4>
                <p class="text-sm text-gray-500" *ngIf="b.date">
                  {{ b.date }}
                </p>

                <p class="text-xs text-gray-500 mt-1" *ngIf="b.verse">
                  {{ b.verse }}
                </p>
              </div>

              <div class="flex items-center gap-2">
                <span class="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase">
                  {{ b.type }}
                </span>

                <button
                  type="button"
                  class="px-3 py-2 text-sm rounded-md border bg-white hover:bg-gray-50"
                  (click)="remove(b)"
                >
                  Remove
                </button>
              </div>
            </div>

            <div *ngIf="b.preview" class="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
              <div class="text-gray-700 text-sm leading-relaxed italic">
                "{{ b.preview }}"
              </div>
            </div>
          </div>

          <div class="pt-2 flex justify-end">
            <button
              type="button"
              (click)="clearAll()"
              class="px-4 py-2 rounded-md border bg-white hover:bg-gray-50 text-sm font-semibold"
            >
              Clear All Bookmarks
            </button>
          </div>
        </div>

        <ng-template #emptyState>
          <div class="text-gray-500 italic text-center py-10">
            No bookmarks yet.
          </div>
        </ng-template>
      </div>
    </section>
  </main>
  `
})
export class BookmarksComponent implements OnInit {
  items: BookmarkItem[] = [];

  activeTab: 'homilies' | 'gospels' = 'homilies';
  canUseBookmarks = true;

  constructor(private bookmarks: BookmarkService) {}

  ngOnInit(): void {
    this.canUseBookmarks = this.bookmarks.canUseBookmarks();
    this.load();
  }

  get homilyItems(): BookmarkItem[] {
    return this.items.filter(x => x.type === 'homily');
  }

  get gospelItems(): BookmarkItem[] {
    return this.items.filter(x => x.type === 'gospel');
  }

  get currentItems(): BookmarkItem[] {
    return this.activeTab === 'homilies' ? this.homilyItems : this.gospelItems;
  }

  load(): void {
    this.items = this.bookmarks.getAll();
  }

  remove(b: BookmarkItem): void {
    this.bookmarks.remove(b.type, b.id);
    this.load();
  }

  clearAll(): void {
    this.bookmarks.clearAll();
    this.load();
  }

  clearTab(): void {
    this.bookmarks.clearType(this.activeTab === 'homilies' ? 'homily' : 'gospel');
    this.load();
  }
}
