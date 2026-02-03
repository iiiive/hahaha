import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AmanuService } from '../../../core/services/amanu.service';
import { AuthService } from '../../../core/services/auth.service';
import { Amanu } from '../../../shared/models/amanu';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-homilies',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './homilies.component.html',
  styleUrls: ['./homilies.component.scss']
})
export class HomiliesComponent implements OnInit, AfterViewInit, OnDestroy {
  homilies: Amanu[] = [];
  filteredHomilies: Amanu[] = [];
  modalForm!: FormGroup;
  showModal = false;
  modalType: 'homily' = 'homily';
  selectedYear: number | null = null;
  selectedMonth: number | null = null;
  isAdmin: boolean = false;
  themesList: string[] = ['Advent', 'Christmas', 'Epiphany', 'Lent', 'Easter', 'Pentecost', 'Ordinary Time'];
  years: number[] = [];
  months = [
    { name: 'January', value: 1 }, { name: 'February', value: 2 }, { name: 'March', value: 3 },
    { name: 'April', value: 4 }, { name: 'May', value: 5 }, { name: 'June', value: 6 },
    { name: 'July', value: 7 }, { name: 'August', value: 8 }, { name: 'September', value: 9 },
    { name: 'October', value: 10 }, { name: 'November', value: 11 }, { name: 'December', value: 12 }
  ];
  editingId: number | null = null;

  // REVIEW STATE (same idea as in GospelComponent)
  isReviewing = false;
  reviewData: any = null;

  // VIEW-ONLY STATE (for clicking a card)
  showViewModal = false;
  viewHomilyItem: Amanu | null = null;

  // ✅ INTERNAL SCROLL STATE (max ~3 visible)
  @ViewChild('homilyScroll') homilyScroll?: ElementRef<HTMLElement>;
  @ViewChildren('homilyItem') homilyItems?: QueryList<ElementRef<HTMLElement>>;

  scrollMaxHeight = 520; // fallback until measured
  scrollAtTop = true;
  scrollAtBottom = false;

  private resizeObserver?: ResizeObserver;
  private itemsSub?: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private amanuService: AmanuService,
    private toastr: ToastrService
  ) {
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit() {
    this.modalForm = this.fb.group({
      id: [''],
      type: ['homily', Validators.required],
      title: ['', Validators.required],
      date: ['', Validators.required],
      theme: ['', Validators.required],
      scripture: ['', Validators.required],
      reading: [''],
      content: ['', Validators.required]
    });
    this.loadHomilies();
  }

  ngAfterViewInit(): void {
    // Watch changes of *ngFor items so we recalc height when filters change
    this.itemsSub = this.homilyItems?.changes.subscribe(() => {
      this.deferRecalcScrollBox();
    });

    // Watch size changes (window resize / layout changes)
    if (this.homilyScroll?.nativeElement && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.deferRecalcScrollBox());
      this.resizeObserver.observe(this.homilyScroll.nativeElement);
    }

    this.deferRecalcScrollBox();
  }

  ngOnDestroy(): void {
    try { this.itemsSub?.unsubscribe?.(); } catch {}
    try { this.resizeObserver?.disconnect(); } catch {}
  }

  loadHomilies() {
    this.amanuService.getAll().subscribe(data => {
      this.homilies = data.filter(item => item.type === 'homily');
      this.filteredHomilies = [...this.homilies];
      this.populateYears();
      this.applyFilters();

      // after data load, compute scroll height
      this.deferRecalcScrollBox();
    });
  }

  populateYears() {
    const yearSet = new Set(this.homilies.map(h => new Date(h.date).getFullYear()));
    this.years = Array.from(yearSet).sort((a, b) => b - a);
  }

  applyFilters() {
    this.filteredHomilies = this.homilies.filter(h => {
      const d = new Date(h.date);
      const yearMatch = !this.selectedYear || d.getFullYear() === this.selectedYear;
      const monthMatch = !this.selectedMonth || (d.getMonth() + 1) === this.selectedMonth;
      return yearMatch && monthMatch;
    });

    this.deferRecalcScrollBox();
  }

  /** Modal Management */
  addHomily() {
    if (!this.isAdmin) return alert('Please login as admin.');
    this.openModal();
  }

  editContent(id: number) {
    const item = this.homilies.find(h => h.id === id);
    if (!item) return alert('Content not found.');
    this.openModal(item);
  }

  deleteContent(id: number) {
    if (!this.isAdmin) {
      this.toastr.warning('Please login as admin.');
      return;
    }

    if (!confirm('Are you sure you want to delete this homily?')) return;

    this.amanuService.delete(id).subscribe({
      next: () => {
        this.toastr.success('Homily deleted successfully.');
        this.loadHomilies();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Failed to delete homily. Please try again.');
      }
    });
  }

  openModal(item?: Amanu) {
    this.isReviewing = false;
    this.reviewData = null;

    if (item) {
      // edit mode
      this.editingId = item.id;
      this.modalForm.patchValue({
        type: 'homily',
        title: item.title,
        date: new Date(item.date).toISOString().substring(0, 10),
        theme: item.theme,
        scripture: item.scripture,
        reading: item.reading,
        content: item.content
      });
    } else {
      // add mode
      this.editingId = null;
      this.modalForm.reset({
        type: 'homily',
        title: '',
        date: '',
        theme: '',
        scripture: '',
        reading: '',
        content: ''
      });
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.isReviewing = false;
    this.reviewData = null;
  }

  /** VIEW-ONLY MODAL – when clicking a card */
  openViewHomily(item: Amanu) {
    this.viewHomilyItem = item;
    this.showViewModal = true;
  }

  closeViewModal() {
    this.showViewModal = false;
    this.viewHomilyItem = null;
  }

  /** Internal save used AFTER review */
  private persistHomily() {
    if (this.modalForm.invalid) {
      this.toastr.warning('Form became invalid. Please check the fields.');
      this.isReviewing = false;
      this.modalForm.markAllAsTouched();
      return;
    }

    const formValue = this.modalForm.value;

    const homily: Amanu = {
      id: this.editingId ?? 0,
      type: 'homily',
      title: formValue.title?.trim() || '',
      date: formValue.date,
      theme: formValue.theme || null,
      scripture: formValue.scripture || null,
      reading: formValue.reading || '',
      content: formValue.content?.trim() || '',
      createdBy: 'test-user',  // TODO: replace with logged-in user
      modifiedBy: 'test-user',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };

    console.log('Saving homily:', homily);

    if (this.editingId) {
      // Update existing homily
      this.amanuService.update(this.editingId, homily).subscribe({
        next: () => {
          this.toastr.success('Homily updated successfully.');
          this.loadHomilies();
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.toastr.error('Failed to update homily. Please try again.');
        }
      });
    } else {
      // Create new homily
      this.amanuService.create(homily).subscribe({
        next: () => {
          this.toastr.success('Homily created successfully.');
          this.loadHomilies();
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.toastr.error('Failed to create homily. Please try again.');
        }
      });
    }
  }

  // -------- REVIEW FLOW (same UX as Gospel) --------
  startReview() {
    if (this.modalForm.invalid) {
      this.toastr.warning('Please fill all required fields.');
      this.modalForm.markAllAsTouched();
      return;
    }
    this.reviewData = this.modalForm.value;
    this.isReviewing = true;
  }

  backToEdit() {
    this.isReviewing = false;
  }

  confirmAndSave() {
    this.persistHomily();
  }

  themes(): string[] {
    return this.themesList;
  }

  get modalTitle(): string {
    if (this.isReviewing) return 'Review Homily';
    const isEditing = !!this.modalForm.get('id')?.value;
    return isEditing ? 'Edit Homily' : 'Add New Homily';
  }

  getShortContent(content?: string): string {
    if (!content) return '';
    return content.length > 200 ? content.slice(0, 200) + '...' : content;
  }

  // ==========================
  // ✅ INTERNAL SCROLL HELPERS
  // ==========================

  private deferRecalcScrollBox(): void {
    setTimeout(() => {
      this.recalcScrollBoxMaxHeight();
      this.onScroll();
    }, 0);
  }

  private recalcScrollBoxMaxHeight(): void {
    const scrollEl = this.homilyScroll?.nativeElement;
    const items = this.homilyItems?.toArray().map(x => x.nativeElement) || [];
    if (!scrollEl) return;

    if (items.length === 0) {
      this.scrollMaxHeight = 220;
      return;
    }

    const n = Math.min(3, items.length);
    const firstRect = items[0].getBoundingClientRect();
    const nthRect = items[n - 1].getBoundingClientRect();

    const contentHeight = Math.max(0, nthRect.bottom - firstRect.top);
    const buffer = 16;

    this.scrollMaxHeight = Math.max(260, Math.min(700, Math.round(contentHeight + buffer)));
  }

  onScroll(): void {
    const el = this.homilyScroll?.nativeElement;
    if (!el) return;

    const top = el.scrollTop;
    const max = el.scrollHeight - el.clientHeight;

    this.scrollAtTop = top <= 1;
    this.scrollAtBottom = max <= 1 ? true : top >= (max - 1);
  }

  onScrollKey(e: KeyboardEvent): void {
    const el = this.homilyScroll?.nativeElement;
    if (!el) return;

    const line = 56;
    const page = Math.max(200, Math.floor(el.clientHeight * 0.9));

    const key = e.key;

    if (key === 'ArrowDown') {
      e.preventDefault();
      el.scrollBy({ top: line, behavior: 'smooth' });
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      el.scrollBy({ top: -line, behavior: 'smooth' });
    } else if (key === 'PageDown') {
      e.preventDefault();
      el.scrollBy({ top: page, behavior: 'smooth' });
    } else if (key === 'PageUp') {
      e.preventDefault();
      el.scrollBy({ top: -page, behavior: 'smooth' });
    } else if (key === 'Home') {
      e.preventDefault();
      el.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (key === 'End') {
      e.preventDefault();
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else if (key === ' ' || key === 'Spacebar') {
      e.preventDefault();
      el.scrollBy({ top: e.shiftKey ? -page : page, behavior: 'smooth' });
    }

    setTimeout(() => this.onScroll(), 80);
  }
}
