import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type FaqCategory =
  | 'Most Common'
  | 'Amanu'
  | 'Online Giving'
  | 'Scheduling'
  | 'Documents'
  | 'Admin';

interface FaqItem {
  category: FaqCategory;
  q: string;
  a: string;
  common?: boolean; // marks items for "Most Common"
}

@Component({
  selector: 'app-faqs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <main class="max-w-6xl mx-auto px-4 py-8">
    <div class="bg-white rounded-2xl shadow p-6">

      <!-- Header -->
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-5">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">FAQs (Help Guide)</h2>
          <p class="text-sm text-gray-600">
            Easy guide for everyone — young or old.
          </p>
        </div>

        <!-- Search -->
        <div class="w-full md:w-[360px]">
          <input
            [(ngModel)]="search"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none
                   focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
            placeholder="Search (ex: gcash, schedule, document, donation)..."
          />
        </div>
      </div>

      <!-- Layout -->
      <div class="grid grid-cols-1 md:grid-cols-[260px,1fr] gap-5">

        <!-- Left: Category Menu -->
        <aside class="md:sticky md:top-24 self-start">
          <div class="border border-purple-100 rounded-xl p-3 bg-purple-50/40">
            <div class="text-xs font-semibold text-gray-600 mb-2">CATEGORIES</div>

            <button
              *ngFor="let c of categories"
              (click)="activeCategory = c"
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium mb-2 transition"
              [ngClass]="activeCategory === c
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-purple-50'"
            >
              {{ c }}
            </button>

            <div class="mt-3 text-xs text-gray-600 leading-relaxed">
              Tip: Choose a category so you don’t need to scroll down.
            </div>
          </div>
        </aside>

        <!-- Right: Content -->
        <section class="min-w-0">

          <!-- Most Common Section (Senior-Friendly) -->
          <div *ngIf="activeCategory === 'Most Common'" class="mb-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-lg font-bold text-gray-800">Most Common Questions</h3>
              <div class="text-xs text-gray-500">For quick help</div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div
                *ngFor="let it of filteredCommon()"
                class="border border-purple-100 rounded-xl p-4 bg-purple-50/60"
              >
                <div class="font-semibold text-gray-800">{{ it.q }}</div>
                <div class="text-sm text-gray-600 mt-2 leading-relaxed">
                  {{ it.a }}
                </div>
              </div>
            </div>
          </div>

          <!-- FAQ List (Internal Scroll Container) -->
          <div class="border border-gray-200 rounded-2xl overflow-hidden">
            <div class="px-4 py-3 border-b bg-white flex items-center justify-between">
              <div class="font-semibold text-gray-800">
                {{ activeCategory }} FAQs
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="text-xs px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700
                         hover:bg-purple-50 transition"
                  (click)="expandAll()"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  class="text-xs px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700
                         hover:bg-purple-50 transition"
                  (click)="collapseAll()"
                >
                  Collapse all
                </button>
              </div>
            </div>

            <div class="p-4 overflow-auto max-h-[calc(100vh-260px)] bg-white">
              <div *ngIf="filteredItems().length === 0" class="text-sm text-gray-600">
                No results found. Try a different keyword.
              </div>

              <div class="space-y-3">
                <div
                  *ngFor="let it of filteredItems(); let i = index"
                  class="border border-gray-200 rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    class="w-full flex items-start justify-between gap-3 px-4 py-3 text-left
                           hover:bg-purple-50 transition"
                    (click)="toggle(i)"
                  >
                    <div>
                      <div class="text-sm font-semibold text-gray-800">
                        {{ it.q }}
                      </div>
                      <div class="text-xs text-gray-500 mt-1">
                        Category: {{ it.category }}
                      </div>
                    </div>

                    <div class="text-purple-600 text-lg leading-none mt-1 font-semibold">
                      {{ opened.has(i) ? '–' : '+' }}
                    </div>
                  </button>

                  <div *ngIf="opened.has(i)" class="px-4 pb-4 text-sm text-gray-600 leading-relaxed bg-white">
                    {{ it.a }}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </section>
      </div>
    </div>
  </main>
  `
})
export class FaqsComponent {
  search = '';
  activeCategory: FaqCategory = 'Most Common';
  opened = new Set<number>();

  categories: FaqCategory[] = [
    'Most Common',
    'Amanu',
    'Online Giving',
    'Scheduling',
    'Documents',
    'Admin'
  ];

  faqs: FaqItem[] = [
    // ===== MOST COMMON (Senior friendly) =====
    {
      category: 'Documents',
      q: 'How do I request a church document?',
      a: 'Go to Documents → choose document type → fill up the form → click Review & Submit → check details → Confirm & Submit.',
      common: true
    },
    {
      category: 'Online Giving',
      q: 'How do I donate using Online Giving?',
      a: 'Go to Online Giving → fill name & email → choose donation type → choose amount → enter GCash reference number → Complete Donation → Confirm & Submit.',
      common: true
    },
    {
      category: 'Scheduling',
      q: 'How do I schedule a service (Wedding/Baptism/etc.)?',
      a: 'Go to Scheduling → choose service type → fill details → select preferred date & time → Review & Schedule → Confirm & Submit.',
      common: true
    },
    {
      category: 'Online Giving',
      q: 'Where do I find the GCash reference number?',
      a: 'After paying in GCash, you will see a Reference Number (proof). Copy that number and paste it into the form.',
      common: true
    },

    // ===== AMANU =====
    {
      category: 'Amanu',
      q: 'What is “Amanu”?',
      a: 'Amanu is where you can view the Word of God posts (Gospel/Homily). You can read and save your favorites.'
    },
    {
      category: 'Amanu',
      q: 'How do I bookmark a Gospel/Homily?',
      a: 'Open Amanu → find the post you like → click the bookmark icon → it will appear in your Bookmarks page.'
    },

    // ===== ONLINE GIVING =====
    {
      category: 'Online Giving',
      q: 'What is Donation Type?',
      a: 'It tells the church what your donation is for (Offering / Kapaldanan / Kapasalamat / Other).'
    },
    {
      category: 'Online Giving',
      q: 'What happens after I click “Complete Donation”?',
      a: 'A Review Donation pop-up appears. Check your details then click Confirm & Submit. If wrong, click Back to edit.'
    },

    // ===== SCHEDULING =====
    {
      category: 'Scheduling',
      q: 'What is “Preferred Date and Time”?',
      a: 'It is the schedule you want. The church will review and confirm if the slot is available.'
    },
    {
      category: 'Scheduling',
      q: 'What does the “Clear” button do?',
      a: 'It removes what you typed so you can start again.'
    },

    // ===== DOCUMENTS =====
    {
      category: 'Documents',
      q: 'Why do form fields change when I select a document type?',
      a: 'Different documents require different details. The system shows only the needed fields for your chosen document.'
    },
    {
      category: 'Documents',
      q: 'How do I pay using GCash for documents?',
      a: 'Choose GCash as payment → use the GCash number/QR on the right → pay → paste the GCash reference number into the form.'
    },
    {
      category: 'Documents',
      q: 'What happens after I click “Review & Submit Request”?',
      a: 'A review pop-up shows your full request. If correct click Confirm & Submit. If not, click Back to Edit.'
    },

    // ===== ADMIN =====
    {
      category: 'Admin',
      q: 'Where can I see who approved or edited requests?',
      a: 'Check the Audit Logs / Activity Log (Admin/Super Admin). It shows who did what and when.'
    },
    {
      category: 'Admin',
      q: 'How do I help users who can’t submit?',
      a: 'Tell them to check required fields, date/time selection, and GCash reference number (if needed). Ask for screenshot if still failing.'
    }
  ];

  filteredCommon(): FaqItem[] {
    const s = this.search.trim().toLowerCase();
    return this.faqs
      .filter(x => x.common)
      .filter(x => !s || (x.q + ' ' + x.a).toLowerCase().includes(s))
      .slice(0, 6);
  }

  filteredItems(): FaqItem[] {
    const s = this.search.trim().toLowerCase();

    const base =
      this.activeCategory === 'Most Common'
        ? this.faqs
        : this.faqs.filter(x => x.category === this.activeCategory);

    return base.filter(x => !s || (x.q + ' ' + x.a).toLowerCase().includes(s));
  }

  toggle(i: number): void {
    if (this.opened.has(i)) this.opened.delete(i);
    else this.opened.add(i);
  }

  expandAll(): void {
    this.opened = new Set(this.filteredItems().map((_, idx) => idx));
  }

  collapseAll(): void {
    this.opened.clear();
  }
}
