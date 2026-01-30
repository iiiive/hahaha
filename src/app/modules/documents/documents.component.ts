import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { Documentrequest } from '../../shared/models/documentrequest';
import { DocumentRequestService } from '../../core/services/document-request.service';
import { AuthService } from '../../core/services/auth.service';

type DocStatus = 'Pending' | 'ReadyForPickup' | 'Claimed' | 'Rejected' | 'Deleted';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss']
})
export class DocumentsComponent implements OnInit {
  requestForm!: FormGroup;

  isAdmin = false;
  selectedType = '';

  // Admin: all requests
  requests: Documentrequest[] = [];

  // User: own requests (from /my)
  myRequests: Documentrequest[] = [];

  selectedRequest: Documentrequest | null = null;
  loading = false;
  editingId: number | null = null;

  // Review modal
  showReviewModal = false;
  reviewData: any = null;

  // Payment toggle
  showGcashDetails = false;

  // Left-side filter
  selectedDocFilter: string = 'all';
  docTypeFilters = [
    { key: 'all', label: 'All' },
    { key: 'baptismal', label: 'Baptismal' },
    { key: 'confirmation', label: 'Confirmation' },
    { key: 'wedding', label: 'Wedding' },
    { key: 'death', label: 'Death' }
  ];

  // Claimed Items toggle (admin)
  showClaimedItems = false;

  constructor(
    private fb: FormBuilder,
    private documentService: DocumentRequestService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    // ✅ keep your existing behavior
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.initForm();

    // ✅ IMPORTANT: always keep validators synced to documentType
    this.requestForm.get('documentType')?.valueChanges.subscribe((v) => {
      this.selectedType = (v || '').toString();
      this.updateValidators();
    });

    // ✅ run once at start
    this.selectedType = (this.requestForm.get('documentType')?.value || '').toString();
    this.updateValidators();

    this.loadRequests();
  }

  // ---------------- HELPERS ----------------
  private normalizeStatus(raw: any): DocStatus {
    const s = String(raw ?? 'Pending').trim().toLowerCase();

    if (s === 'readyforpickup' || s === 'ready_for_pickup' || s === 'ready') return 'ReadyForPickup';
    if (s === 'claimed') return 'Claimed';
    if (s === 'rejected') return 'Rejected';
    if (s === 'deleted') return 'Deleted';
    return 'Pending';
  }

  // ---------------- FORM INIT ----------------
  initForm(): void {
    this.requestForm = this.fb.group({
      documentType: ['', Validators.required],

      firstName: [''],
      lastName: [''],
      birthDate: [''],
      phone: [''],

      email: ['', [Validators.required, Validators.email]],

      // ✅ IMPORTANT: DO NOT make this required (you don't have an input for it in HTML)
      purpose: [''],

      copies: ['1', Validators.required],

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

      status: ['Pending']
    });
  }

  // ---------------- LOAD REQUESTS ----------------
  loadRequests(): void {
    this.loading = true;

    const req$ = this.isAdmin
      ? this.documentService.getAll()
      : this.documentService.getMy();

    req$.subscribe({
      next: (data: any[]) => {
        const normalized = (data || []).map((req: any) => {
          const rawStatus = req.status ?? req.Status ?? 'Pending';
          const status = this.normalizeStatus(rawStatus);

          const rawDocType = (req.documentType ?? req.DocumentType ?? '').toString().trim();

          return {
            ...req,
            status,
            documentType: rawDocType || req.documentType
          };
        });

        if (this.isAdmin) this.requests = normalized;
        else this.myRequests = normalized;

        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading requests:', err);
        this.toastr.error('Failed to load document requests.');
        this.loading = false;
      }
    });
  }

  // ✅ ADMIN: Recent Requests EXCLUDE claimed + rejected
  // ✅ USER: show own requests normally
  get filteredRequests(): Documentrequest[] {
    const source = this.isAdmin ? this.requests : this.myRequests;

    let list = this.isAdmin
      ? source.filter((r: any) => {
          const st = String((r.status as any) || 'Pending').trim();
          return st !== 'Claimed' && st !== 'Rejected';
        })
      : source;

    if (this.selectedDocFilter === 'all') return list;

    return list.filter(
      (r: any) =>
        String(r.documentType || r.DocumentType || '')
          .toLowerCase()
          .trim() === this.selectedDocFilter
    );
  }

  // ✅ Claimed Items: last 10 claimed
  get claimedHistory(): Documentrequest[] {
    if (!this.isAdmin) return [];

    const claimed = (this.requests || []).filter(
      (r: any) => this.normalizeStatus(r.status ?? r.Status) === 'Claimed'
    );

    claimed.sort((a: any, b: any) => {
      const ad = new Date(a.modifiedAt || a.ModifiedAt || a.createdAt || a.CreatedAt || 0).getTime();
      const bd = new Date(b.modifiedAt || b.ModifiedAt || b.createdAt || b.CreatedAt || 0).getTime();
      return bd - ad;
    });

    return claimed.slice(0, 10);
  }

  toggleClaimedItems(): void {
    this.showClaimedItems = !this.showClaimedItems;
  }

  setDocFilter(key: string): void {
    this.selectedDocFilter = key;
  }

  // you can keep this since your HTML calls it
  onTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedType = select.value;
    this.updateValidators();
  }

  // ---------------- ADMIN: UPDATE STATUS ----------------
  setStatus(id: number, status: DocStatus): void {
    if (!this.isAdmin) return;

    const idx = this.requests.findIndex((r: any) => (r.id ?? r.Id) === id);
    const prev =
      idx >= 0
        ? this.normalizeStatus((this.requests[idx] as any).status ?? (this.requests[idx] as any).Status)
        : 'Pending';

    if (idx >= 0) (this.requests[idx] as any).status = status;

    this.documentService.updateStatus(id, status).subscribe({
      next: () => {
        this.toastr.success(`Marked as ${status}`);
        this.loadRequests();
      },
      error: (err: any) => {
        console.error('Status update failed:', err);
        this.toastr.error('Failed to update status.');
        if (idx >= 0) (this.requests[idx] as any).status = prev;
      }
    });
  }

  // ---------------- REVIEW FLOW ----------------
  startReview(): void {
    // ✅ helpful debug (optional)
    // console.log('INVALID CONTROLS:',
    //   Object.keys(this.requestForm.controls).filter(k => this.requestForm.get(k)?.invalid),
    //   this.requestForm.value
    // );

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

  // ---------------- SAVE / UPDATE ----------------
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
      status: (formValue.status || 'Pending') as any,
      createdAt: this.selectedRequest ? (this.selectedRequest as any).createdAt : nowIso,
      modifiedAt: nowIso,
      createdBy: this.selectedRequest
        ? (this.selectedRequest as any).createdBy
        : (this.isAdmin ? 'admin-user' : 'regular-user'),
      modifiedBy: this.isAdmin ? 'admin-user' : 'regular-user'
    };

    request = {
      ...request,
      firstName: formValue.firstName || '',
      lastName: formValue.lastName || ''
    };

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
        error: (err: any) => {
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
        error: (err: any) => {
          console.error('Create failed:', err);
          this.toastr.error('Failed to create document request. Please try again.');
        }
      });
    }
  }

  // ---------------- DYNAMIC VALIDATION ----------------
  updateValidators(): void {
    // clear everything first
    Object.keys(this.requestForm.controls).forEach((key) => {
      this.requestForm.get(key)?.clearValidators();
      this.requestForm.get(key)?.updateValueAndValidity({ emitEvent: false });
    });

    // always required
    this.requestForm.get('documentType')?.setValidators(Validators.required);
    this.requestForm.get('email')?.setValidators([Validators.required, Validators.email]);
    this.requestForm.get('copies')?.setValidators([Validators.required]);

    // ✅ For admin: these base fields are required
    if (this.isAdmin) {
      this.requestForm.get('firstName')?.setValidators(Validators.required);
      this.requestForm.get('lastName')?.setValidators(Validators.required);
      this.requestForm.get('birthDate')?.setValidators(Validators.required);
      this.requestForm.get('phone')?.setValidators([
        Validators.required,
        Validators.pattern(/^\+?[0-9]{10,15}$/)
      ]);

      // ✅ IMPORTANT FIX:
      // DO NOT REQUIRE "purpose" because there is NO input bound to formControlName="purpose"
      // and you already have naPurpose/wedPurpose/deathPurpose.
      // this.requestForm.get('purpose')?.setValidators(Validators.required);  ❌ removed
    }

    // type-specific required fields
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
      this.requestForm.get('deathPurpose')?.setValidators(Validators.required);
    }

    // apply changes
    Object.keys(this.requestForm.controls).forEach((key) => {
      this.requestForm.get(key)?.updateValueAndValidity({ emitEvent: false });
    });
  }

  // ---------------- EDIT / CLEAR ----------------
  editRequest(req: Documentrequest): void {
    this.selectedRequest = req;
    this.editingId = (req as any).id ?? (req as any).Id;
    this.selectedType = (req as any).documentType ?? (req as any).DocumentType;

    this.requestForm.patchValue({
      documentType: (req as any).documentType ?? (req as any).DocumentType,
      firstName: (req as any).firstName ?? (req as any).FirstName ?? '',
      lastName: (req as any).lastName ?? (req as any).LastName ?? '',
      birthDate: (req as any).dateOfBirth
        ? new Date((req as any).dateOfBirth).toISOString().substring(0, 10)
        : '',
      phone: (req as any).contactPhone ?? '',
      email: (req as any).emailAddress ?? '',
      purpose: (req as any).purposeOfRequest ?? '',
      copies: (req as any).numberOfCopies ?? '1',
      status: this.normalizeStatus((req as any).status ?? (req as any).Status) as any,

      childName: (req as any).childName ?? '',
      sacramentDate: (req as any).documentDate
        ? new Date((req as any).documentDate).toISOString().substring(0, 10)
        : '',
      birthday: (req as any).dateOfBirth
        ? new Date((req as any).dateOfBirth).toISOString().substring(0, 10)
        : '',
      naPurpose: (req as any).purposeOfRequest ?? '',
      naContact: (req as any).contactPhone ?? '',

      groom: (req as any).groomsFullName ?? '',
      bride: (req as any).bridesFullName ?? '',
      weddingDate: (req as any).documentDate
        ? new Date((req as any).documentDate).toISOString().substring(0, 10)
        : '',
      weddingPlace: (req as any).address ?? '',
      wedPurpose: (req as any).purposeOfRequest ?? '',
      wedContact: (req as any).contactPhone ?? '',

      deathName: (req as any).fullNameDeceased ?? '',
      deathDate: (req as any).documentDate
        ? new Date((req as any).documentDate).toISOString().substring(0, 10)
        : '',
      deathPlace: (req as any).address ?? '',
      relation: (req as any).relationRequestor ?? '',
      deathContact: (req as any).contactPhone ?? '',
      deathPurpose: (req as any).purposeOfRequest ?? ''
    });

    this.updateValidators();
  }

  clearForm(): void {
    this.requestForm.reset({
      copies: 1,
      status: 'Pending'
    });

    this.selectedRequest = null;
    this.editingId = null;
    this.selectedType = '';
    this.showReviewModal = false;
    this.reviewData = null;
    this.showGcashDetails = false;

    this.selectedDocFilter = 'all';

    this.updateValidators();
  }
}
