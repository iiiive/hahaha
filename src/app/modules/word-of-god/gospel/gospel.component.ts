import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Amanu } from '../../../shared/models/amanu';
import { AuthService } from '../../../core/services/auth.service';
import { AmanuService } from '../../../core/services/amanu.service';
import { ToastrService } from 'ngx-toastr';

interface Gospel {
  id: number;
  title: string;
  date: string; // keep as string for easier binding to input[type="date"]
  month: number;
  content: string;
  reading: string;
}

@Component({
  selector: 'app-gospel',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './gospel.component.html'
})
export class GospelComponent implements OnInit {
  modalForm!: FormGroup;
  gospels: Amanu[] = [];
  filteredGospels: Amanu[] = [];

  showModal = false;          // form (add/edit) modal
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

  // --- REVIEW STATE ---
  isReviewing = false;
  reviewData: any = null;

  // --- VIEW-ONLY MODAL STATE ---
  showViewModal = false;
  viewGospelItem: Amanu | null = null;

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
      type: ['gospel', Validators.required],
      title: ['', Validators.required],
      date: ['', Validators.required],
      theme: [''],
      scripture: [''],
      reading: ['', Validators.required],
      content: ['', Validators.required]
    });
    this.loadGospels();
  }

  loadGospels() {
    this.amanuService.getAll().subscribe(data => {
      // Filter only gospels
      this.gospels = data.filter(item => item.type === 'gospel');

      // Clone into filtered list
      this.filteredGospels = [...this.gospels];
      this.populateYears();
      this.applyFilters();
    });
  }

  populateYears() {
    const yearSet = new Set(this.gospels.map(h => new Date(h.date).getFullYear()));
    this.years = Array.from(yearSet).sort((a, b) => b - a);
  }

  applyFilters() {
    this.filteredGospels = this.gospels.filter(h => {
      const d = new Date(h.date);
      const yearMatch = !this.selectedYear || d.getFullYear() === this.selectedYear;
      const monthMatch = !this.selectedMonth || (d.getMonth() + 1) === this.selectedMonth;
      return yearMatch && monthMatch;
    });
  }

  /** Modal Management */
  addGospel() {
    if (!this.isAdmin) return alert('Please login as admin.');
    this.openModal();
  }

  editGospel(id: number) {
    const item = this.gospels.find(h => h.id === id);
    if (!item) return alert('Content not found.');
    this.openModal(item);
  }

  deleteGospel(id: number) {
    if (!this.isAdmin) {
      this.toastr.warning('Please login as admin.');
      return;
    }

    if (!confirm('Are you sure you want to delete this gospel?')) return;

    this.amanuService.delete(id).subscribe({
      next: () => {
        this.toastr.success('Gospel deleted successfully.');
        this.loadGospels();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Failed to delete gospel. Please try again.');
      }
    });
  }

  openModal(item?: Amanu) {
    this.isReviewing = false;
    this.reviewData = null;

    if (item) {
      // edit mode
      this.editingId = item.id;  // keep id outside form
      this.modalForm.patchValue({
        type: 'gospel',
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
        type: 'gospel',
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

  // --- VIEW-ONLY MODAL (for clicking a card) ---
  openViewGospel(item: Amanu) {
    this.viewGospelItem = item;
    this.showViewModal = true;
  }

  closeViewModal() {
    this.showViewModal = false;
    this.viewGospelItem = null;
  }

  // --- OLD SAVE LOGIC (used by confirmAndSave) ---
  private persistGospel() {
    const formValue = this.modalForm.value;

    const gospel: Amanu = {
      id: this.editingId ?? 0, // keep id separate
      type: 'gospel',
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

    console.log('Saving gospel:', gospel);

    if (this.editingId) {
      // Update existing gospel
      this.amanuService.update(this.editingId, gospel).subscribe({
        next: () => {
          this.toastr.success('Gospel updated successfully.');
          this.loadGospels();
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.toastr.error('Failed to update gospel. Please try again.');
        }
      });
    } else {
      // Create new gospel
      this.amanuService.create(gospel).subscribe({
        next: () => {
          this.toastr.success('Gospel created successfully.');
          this.loadGospels();
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.toastr.error('Failed to create gospel. Please try again.');
        }
      });
    }
  }

  // --- REVIEW FLOW ---

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
    this.persistGospel();
  }

  themes(): string[] {
    return this.themesList;
  }

  get modalTitle(): string {
    if (this.isReviewing) return 'Review Gospel Reading';
    const isEditing = !!this.modalForm.get('id')?.value;
    return isEditing ? 'Edit Gospel Reading' : 'Add New Gospel';
  }

  getShortContent(content?: string): string {
    if (!content) return '';
    return content.length > 200 ? content.slice(0, 200) + '...' : content;
  }
}
