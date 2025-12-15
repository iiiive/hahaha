import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Documentrequest } from '../../shared/models/documentrequest';
import { DocumentRequestService } from '../../core/services/document-request.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss']
})
export class DocumentsComponent implements OnInit {
  requestForm!: FormGroup;
  isAdmin: boolean = false;
  selectedType: string = ''; // track document type selection

  // All requests (admin only)
  requests: Documentrequest[] = [];
  selectedRequest: Documentrequest | null = null;
  loading = false;
  editingId: number | null = null;

  // REVIEW MODAL STATE
  showReviewModal = false;
  reviewData: any = null;

  // PAYMENT TOGGLE (GCash vs Cash)
  showGcashDetails = false; // default: cash payment

  // Admin filter for left-side list (similar to Scheduling)
  selectedDocFilter: string = 'all';
  docTypeFilters = [
    { key: 'all', label: 'All' },
    { key: 'baptismal', label: 'Baptismal' },
    { key: 'confirmation', label: 'Confirmation' },
    { key: 'wedding', label: 'Wedding' },
    { key: 'death', label: 'Death' }
  ];

  constructor(
    private fb: FormBuilder,
    private documentService: DocumentRequestService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit() {
    this.initForm();
    this.loadRequests();
  }

  // ---------- FORM INIT ----------

  initForm() {
    this.requestForm = this.fb.group({
      documentType: ['', Validators.required],
      firstName: ['', this.isAdmin ? Validators.required : []],
      lastName: ['', this.isAdmin ? Validators.required : []],
      birthDate: ['', this.isAdmin ? Validators.required : []],

      // Phone validation (must be 10–15 digits, allows + at start)
      phone: ['', this.isAdmin ? [
        Validators.required,
        Validators.pattern(/^\+?[0-9]{10,15}$/)
      ] : []],

      // Email validation
      email: ['', [
        Validators.required,
        Validators.email
      ]],

      purpose: ['', this.isAdmin ? Validators.required : []],
      copies: ['1', Validators.required],

      // non-admin common fields
      // baptismal & confirmation
      childName: [''],
      sacramentDate: [''],
      birthday: [''],
      naPurpose: [''],
      naContact: [''],

      // wedding
      groom: [''],
      bride: [''],
      weddingDate: [''],
      weddingPlace: [''],
      wedPurpose: [''],
      wedContact: [''],

      // death
      deathName: [''],
      deathDate: [''],
      deathPlace: [''],
      relation: [''],
      deathContact: [''],
      deathPurpose: [''],

      status: [''] // admin only
    });
  }

  // ---------- LOAD & FILTER REQUESTS ----------

  loadRequests() {
    this.loading = true;
    this.documentService.getAll().subscribe({
      next: data => {
        if (this.isAdmin) {
          this.requests = data.map((req: any) => ({
            ...req,
            status: req.status || 'Processing'
          }));
        }
        this.loading = false;
      },
      error: err => {
        console.error('Error loading requests:', err);
        this.loading = false;
      }
    });
  }

  get filteredRequests(): Documentrequest[] {
    if (!this.isAdmin) return [];
    if (this.selectedDocFilter === 'all') return this.requests;
    return this.requests.filter(r => r.documentType === this.selectedDocFilter);
  }

  setDocFilter(key: string): void {
    this.selectedDocFilter = key;
  }

  onTypeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedType = select.value;
    this.updateValidators();
  }

  // ---------- PAYMENT TOGGLE ----------

  toggleGcash(): void {
    this.showGcashDetails = !this.showGcashDetails;
  }

  // ---------- REVIEW FLOW ----------

  startReview(): void {
    if (this.requestForm.invalid) {
      this.toastr.warning('Please fill all required fields.');
      this.requestForm.markAllAsTouched();
      return;
    }

    const formValue = this.requestForm.value;

    this.reviewData = {
      ...formValue,
      documentTypeLabel: this.getDocumentTypeLabel(formValue.documentType),
      isAdmin: this.isAdmin,
      payViaGcash: this.showGcashDetails
    };

    this.showReviewModal = true;
  }

  backToEdit(): void {
    this.showReviewModal = false;
  }

  confirmAndSubmit(): void {
    this.showReviewModal = false;
    this.persistRequest();
  }

  getDocumentTypeLabel(type: string): string {
    switch (type) {
      case 'baptismal': return 'Baptismal Certificate';
      case 'confirmation': return 'Confirmation Certificate';
      case 'wedding': return 'Wedding Certificate';
      case 'death': return 'Death Certificate';
      default: return type;
    }
  }

  // ---------- SAVE / UPDATE ----------

  private persistRequest(): void {
    if (this.requestForm.invalid) {
      this.toastr.warning('Form became invalid. Please check the fields.');
      this.requestForm.markAllAsTouched();
      return;
    }

    const formValue = this.requestForm.value;
    const nowIso = new Date().toISOString();

    let request: Documentrequest = {
      id: this.editingId ?? 0,
      documentType: formValue.documentType,
      contactPhone: '',
      emailAddress: formValue.email || '',
      status: this.selectedRequest ? (formValue.status || this.selectedRequest.status) : 'Processing',
      createdAt: this.selectedRequest ? this.selectedRequest.createdAt : nowIso,
      modifiedAt: nowIso,
      createdBy: this.selectedRequest
        ? this.selectedRequest.createdBy
        : (this.isAdmin ? 'admin-user' : 'regular-user'),
      modifiedBy: this.selectedRequest
        ? (this.isAdmin ? 'admin-user' : 'regular-user')
        : undefined
    };

    if (this.isAdmin) {
      request = {
        ...request,
        dateOfBirth: formValue.birthDate || '',
        contactPhone: formValue.phone || '',
        purposeOfRequest: formValue.purpose || '',
        numberOfCopies: String(formValue.copies || 1)
      };
    }

    // All: name
    request = {
      ...request,
      firstName: formValue.firstName || '',
      lastName: formValue.lastName || ''
    };

    // Type-specific mapping
    switch (formValue.documentType) {
      case 'baptismal':
      case 'confirmation':
        request = {
          ...request,
          childName: formValue.childName || '',
          dateOfBirth: formValue.birthday || '',
          documentDate: formValue.sacramentDate
            ? new Date(formValue.sacramentDate).toISOString().split('T')[0]
            : undefined,
          purposeOfRequest: formValue.naPurpose || '',
          contactPhone: formValue.naContact || ''
        };
        break;

      case 'wedding':
        request = {
          ...request,
          groomsFullName: formValue.groom || '',
          bridesFullName: formValue.bride || '',
          documentDate: formValue.weddingDate
            ? new Date(formValue.weddingDate).toISOString().split('T')[0]
            : undefined,
          address: formValue.weddingPlace || '',
          purposeOfRequest: formValue.wedPurpose || '',
          contactPhone: formValue.wedContact || ''
        };
        break;

      case 'death':
        request = {
          ...request,
          fullNameDeceased: formValue.deathName || '',
          documentDate: formValue.deathDate
            ? new Date(formValue.deathDate).toISOString().split('T')[0]
            : undefined,
          address: formValue.deathPlace || '',
          relationRequestor: formValue.relation || '',
          contactPhone: formValue.deathContact || '',
          purposeOfRequest: formValue.deathPurpose || ''
        };
        break;
    }

    if (this.editingId) {
      this.documentService.update(this.editingId, request).subscribe({
        next: () => {
          this.toastr.success('Document request updated successfully.');
          this.loadRequests();
          this.clearForm();
        },
        error: err => {
          console.error('Update failed:', err);
          this.toastr.error('Failed to update document request. Please try again.');
        }
      });
    } else {
      this.documentService.create(request).subscribe({
        next: () => {
          this.toastr.success('Document request created successfully.');
          this.loadRequests();
          this.clearForm();
        },
        error: err => {
          console.error('Create failed:', err);
          this.toastr.error('Failed to create document request. Please try again.');
        }
      });
    }
  }

  // ---------- DYNAMIC VALIDATION ----------

  updateValidators(): void {
    Object.keys(this.requestForm.controls).forEach(key => {
      this.requestForm.get(key)?.clearValidators();
      this.requestForm.get(key)?.updateValueAndValidity({ emitEvent: false });
    });

    this.requestForm.get('firstName')?.setValidators(Validators.required);
    this.requestForm.get('lastName')?.setValidators(Validators.required);
    this.requestForm.get('documentType')?.setValidators(Validators.required);
    this.requestForm.get('email')?.setValidators([Validators.required, Validators.email]);

    if (this.isAdmin) {
      this.requestForm.get('birthDate')?.setValidators(Validators.required);
      this.requestForm.get('phone')?.setValidators([
        Validators.required,
        Validators.pattern(/^\+?[0-9]{10,15}$/)
      ]);
      this.requestForm.get('purpose')?.setValidators(Validators.required);
      this.requestForm.get('copies')?.setValidators(Validators.required);
    }

    if (this.selectedType === 'baptismal' || this.selectedType === 'confirmation') {
      this.requestForm.get('childName')?.setValidators(Validators.required);
      this.requestForm.get('sacramentDate')?.setValidators(Validators.required);
      this.requestForm.get('birthday')?.setValidators(Validators.required);
      this.requestForm.get('naPurpose')?.setValidators(Validators.required);
      this.requestForm.get('naContact')?.setValidators([
        Validators.required,
        Validators.pattern(/^\+?[0-9]{10,15}$/)
      ]);
    }

    if (this.selectedType === 'wedding') {
      this.requestForm.get('groom')?.setValidators(Validators.required);
      this.requestForm.get('bride')?.setValidators(Validators.required);
      this.requestForm.get('weddingDate')?.setValidators(Validators.required);
      this.requestForm.get('weddingPlace')?.setValidators(Validators.required);
      this.requestForm.get('wedPurpose')?.setValidators(Validators.required);
      this.requestForm.get('wedContact')?.setValidators([
        Validators.required,
        Validators.pattern(/^\+?[0-9]{10,15}$/)
      ]);
    }

    if (this.selectedType === 'death') {
      this.requestForm.get('deathName')?.setValidators(Validators.required);
      this.requestForm.get('deathDate')?.setValidators(Validators.required);
      this.requestForm.get('deathPlace')?.setValidators(Validators.required);
      this.requestForm.get('relation')?.setValidators(Validators.required);
      this.requestForm.get('deathContact')?.setValidators([
        Validators.required,
        Validators.pattern(/^\+?[0-9]{10,15}$/)
      ]);
      // Purpose optional for death cert
    }

    Object.keys(this.requestForm.controls).forEach(key => {
      this.requestForm.get(key)?.updateValueAndValidity();
    });
  }

  // ---------- EDIT / DELETE / CLEAR ----------

  editRequest(req: Documentrequest): void {
    this.selectedRequest = req;
    this.editingId = req.id;
    this.selectedType = req.documentType;

    this.requestForm.patchValue({
      documentType: req.documentType,
      firstName: req.firstName || '',
      lastName: req.lastName || '',
      birthDate: req.dateOfBirth ? new Date(req.dateOfBirth).toISOString().substring(0, 10) : '',
      phone: req.contactPhone || '',
      email: req.emailAddress || '',
      purpose: req.purposeOfRequest || '',
      copies: req.numberOfCopies || '1',

      childName: req.childName || '',
      sacramentDate: req.documentDate ? new Date(req.documentDate).toISOString().substring(0, 10) : '',
      birthday: req.dateOfBirth ? new Date(req.dateOfBirth).toISOString().substring(0, 10) : '',
      naPurpose: req.purposeOfRequest || '',
      naContact: req.contactPhone || '',

      groom: req.groomsFullName || '',
      bride: req.bridesFullName || '',
      weddingDate: req.documentDate ? new Date(req.documentDate).toISOString().substring(0, 10) : '',
      weddingPlace: req.address || '',
      wedPurpose: req.purposeOfRequest || '',
      wedContact: req.contactPhone || '',

      deathName: req.fullNameDeceased || '',
      deathDate: req.documentDate ? new Date(req.documentDate).toISOString().substring(0, 10) : '',
      deathPlace: req.address || '',
      relation: req.relationRequestor || '',
      deathContact: req.contactPhone || '',
      deathPurpose: req.purposeOfRequest || ''
    });

    this.updateValidators();
  }

  deleteRequest(id: number): void {
    if (confirm('Are you sure you want to delete this request?')) {
      this.documentService.delete(id).subscribe({
        next: () => {
          this.toastr.success('Request deleted successfully.');
          this.loadRequests();
        },
        error: err => {
          console.error('Delete failed:', err);
          this.toastr.error('Failed to delete request.');
        }
      });
    }
  }

  clearForm(): void {
    this.requestForm.reset({
      copies: 1,
      status: 'Processing'
    });
    this.selectedRequest = null;
    this.editingId = null;
    this.selectedType = '';
    this.showReviewModal = false;
    this.reviewData = null;
    this.showGcashDetails = false;
  }
}
