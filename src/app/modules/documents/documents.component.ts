import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { Documentrequest } from '../../shared/models/documentrequest';
import { DocumentRequestService } from '../../core/services/document-request.service';
import { AuthService } from '../../core/services/auth.service';

type DocStatus = 'Pending' | 'ReadyForPickup' | 'Claimed' | 'Rejected' | 'Deleted';

type ReviewRow = { label: string; value: any };

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
  selectedType: string = '';

  copyOptions: string[] = ['1 Copy', '2 Copies', '3 Copies', '4 Copies', '5 Copies'];

  // Admin only
  requests: Documentrequest[] = [];

  // User only
  myRequests: Documentrequest[] = [];

  selectedRequest: Documentrequest | null = null;
  loading = false;
  editingId: number | null = null;

  // Review modal
  showReviewModal = false;
  reviewData: any = null;

  // ✅ review rows (to make modal same as Scheduling style)
  reviewRows: ReviewRow[] = [];

  // GCash right panel
  showGcashDetails = false;

  // Admin filters
  selectedDocFilter: string = 'all';
  selectedClaimedFilter: string = 'all';

  docTypeFilters = [
    { key: 'all', label: 'All' },
    { key: 'baptismal', label: 'Baptismal' },
    { key: 'confirmation', label: 'Confirmation' },
    { key: 'wedding', label: 'Wedding' },
    { key: 'death', label: 'Death' }
  ];

  showClaimedItems = false;

  // ✅ VIEW MODAL state (matches your HTML)
  showViewModal = false;
  viewData: any = null;

  constructor(
    private fb: FormBuilder,
    private documentService: DocumentRequestService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.initForm();

    // keep selectedType in sync
    this.requestForm.get('documentType')?.valueChanges.subscribe((v) => {
      this.selectedType = (v || '').toString();
      this.updateValidators();
    });

    this.selectedType = (this.requestForm.get('documentType')?.value || '').toString();
    this.updateValidators();

    this.loadRequests();
  }

  // ---------------- TEMPLATE HELPERS ----------------
  get selectedTypeLabel(): string {
    return this.getDocumentTypeLabel(this.selectedType);
  }

  get isGcash(): boolean {
    const pm = (this.requestForm.get('paymentMethod')?.value || 'Cash').toString();
    return pm.toLowerCase() === 'gcash';
  }

  togglePaymentMethod(): void {
    const current = (this.requestForm.get('paymentMethod')?.value || 'Cash').toString();
    const next = current.toLowerCase() === 'gcash' ? 'Cash' : 'GCash';

    this.requestForm.patchValue({
      paymentMethod: next,
      gcashReferenceNumber: next === 'GCash'
        ? (this.requestForm.get('gcashReferenceNumber')?.value || '')
        : ''
    });

    this.showGcashDetails = next === 'GCash';
    this.updateValidators();
  }

  // ✅ Handle mixed casing from backend just in case
  private normalizeStatus(raw: any): DocStatus {
    const s = String(raw ?? 'Pending').trim().toLowerCase();
    if (s === 'readyforpickup' || s === 'ready_for_pickup' || s === 'ready') return 'ReadyForPickup';
    if (s === 'claimed') return 'Claimed';
    if (s === 'rejected') return 'Rejected';
    if (s === 'deleted') return 'Deleted';
    return 'Pending';
  }

  private normalizeDocType(raw: any): string {
    return String(raw ?? '').trim().toLowerCase();
  }

  // ✅ Payment fields safe getters
  getPaymentMethod(req: Documentrequest): string {
    const r: any = req;
    return (r.paymentMethod ?? r.PaymentMethod ?? 'Cash').toString();
  }

  getGcashReferenceNumber(req: Documentrequest): string {
    const r: any = req;
    return (r.gcashReferenceNumber ?? r.GcashReferenceNumber ?? '').toString();
  }

  isGcashPayment(req: Documentrequest): boolean {
    return this.getPaymentMethod(req).toLowerCase() === 'gcash';
  }

  // ---------------- FORM INIT ----------------
  initForm(): void {
    this.requestForm = this.fb.group({
      documentType: ['', Validators.required],

      firstName: [''],
      lastName: [''],
      email: ['', [Validators.required, Validators.email]],
      copies: ['1 Copy', Validators.required],

      // we keep these for toggling and validators
      paymentMethod: ['Cash'],
      gcashReferenceNumber: [''],

      // bapt/confirm
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

    const obs$ = this.isAdmin
      ? this.documentService.getAll()
      : this.documentService.getMy();

    obs$.subscribe({
      next: (data: any[]) => {
        const normalized: Documentrequest[] = (data || []).map((req: any) => {
          return {
            id: req.id ?? req.Id,
            documentType: this.normalizeDocType(req.documentType ?? req.DocumentType),

            firstName: req.firstName ?? req.FirstName ?? '',
            lastName: req.lastName ?? req.LastName ?? '',

            dateOfBirth: req.dateOfBirth ?? req.DateOfBirth ?? undefined,

            contactPhone: req.contactPhone ?? req.ContactPhone ?? '',
            emailAddress: req.emailAddress ?? req.EmailAddress ?? '',

            purposeOfRequest: req.purposeOfRequest ?? req.PurposeOfRequest ?? '',
            numberOfCopies: req.numberOfCopies ?? req.NumberOfCopies ?? '1 Copy',

            childName: req.childName ?? req.ChildName ?? '',
            documentDate: req.documentDate ?? req.DocumentDate ?? null,

            groomsFullName: req.groomsFullName ?? req.GroomsFullName ?? '',
            bridesFullName: req.bridesFullName ?? req.BridesFullName ?? '',

            address: req.address ?? req.Address ?? '',
            fullNameDeceased: req.fullNameDeceased ?? req.FullNameDeceased ?? '',
            relationRequestor: req.relationRequestor ?? req.RelationRequestor ?? '',

            // payment
            paymentMethod: req.paymentMethod ?? req.PaymentMethod ?? 'Cash',
            gcashReferenceNumber: req.gcashReferenceNumber ?? req.GcashReferenceNumber ?? null,

            status: this.normalizeStatus(req.status ?? req.Status ?? 'Pending'),

            createdAt: req.createdAt ?? req.CreatedAt ?? new Date().toISOString(),
            modifiedAt: req.modifiedAt ?? req.ModifiedAt ?? undefined,

            createdBy: req.createdBy ?? req.CreatedBy ?? 'user',
            modifiedBy: req.modifiedBy ?? req.ModifiedBy ?? undefined,

            userId: req.userId ?? req.UserId ?? null
          } as any;
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

  // ---------------- FILTERED LISTS ----------------
  get filteredRequests(): Documentrequest[] {
    const source = this.isAdmin ? this.requests : this.myRequests;

    // ✅ HARD RULE: never show Deleted anywhere
    let list = (source || []).filter(r => this.normalizeStatus((r as any).status) !== 'Deleted');

    // Admin left column: recent only (not claimed/rejected/deleted)
    if (this.isAdmin) {
      list = list.filter((r: any) => {
        const st = this.normalizeStatus(r.status);
        return st !== 'Claimed' && st !== 'Rejected' && st !== 'Deleted';
      });
    }

    if (this.selectedDocFilter === 'all') return list;

    return list.filter((r: any) =>
      this.normalizeDocType(r.documentType) === this.selectedDocFilter
    );
  }

  get claimedHistory(): Documentrequest[] {
    if (!this.isAdmin) return [];

    let list = (this.requests || []).filter((r: any) => {
      const st = this.normalizeStatus(r.status);
      return st === 'Claimed'; // claimed only
    });

    // optional filter by type
    if (this.selectedClaimedFilter !== 'all') {
      list = list.filter((r: any) =>
        this.normalizeDocType(r.documentType) === this.selectedClaimedFilter
      );
    }

    // sort most recent then take last 10
    list.sort((a: any, b: any) => {
      const ad = new Date(a.modifiedAt || a.createdAt || 0).getTime();
      const bd = new Date(b.modifiedAt || b.createdAt || 0).getTime();
      return bd - ad;
    });

    return list.slice(0, 10);
  }

  setDocFilter(key: string): void {
    this.selectedDocFilter = key;
  }

  setClaimedFilter(key: string): void {
    this.selectedClaimedFilter = key;
  }

  toggleClaimedItems(): void {
    this.showClaimedItems = !this.showClaimedItems;
  }

  onTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedType = select.value;
    this.updateValidators();
  }

  // ---------------- ADMIN STATUS UPDATE ----------------
  setStatus(id: number, status: DocStatus): void {
    if (!this.isAdmin) return;

    this.documentService.updateStatus(id, status).subscribe({
      next: () => {
        this.toastr.success(`Marked as ${status}`);
        this.loadRequests();
      },
      error: (err: any) => {
        console.error('Status update failed:', err);
        this.toastr.error('Failed to update status.');
      }
    });
  }

  // ===================== ✅ CLAIMED ACTIONS (matches your HTML) =====================

  openView(c: Documentrequest): void {
    if (!c?.id) return;

    const base = this.buildViewDataFromRequest(c);
    this.viewData = base;
    this.showViewModal = true;

    this.documentService.getById(c.id).subscribe({
      next: (fresh: any) => {
        const merged = this.buildViewDataFromRequest({ ...(c as any), ...(fresh as any) });
        this.viewData = merged;
      },
      error: (err: any) => {
        console.error('openView getById failed:', err);
      }
    });
  }

  closeView(): void {
    this.showViewModal = false;
    this.viewData = null;
  }

  softDelete(c: Documentrequest): void {
    if (!this.isAdmin) return;
    if (!c?.id) return;

    const ok = confirm('Soft delete this request? It will be marked as Deleted.');
    if (!ok) return;

    this.documentService.delete(c.id).subscribe({
      next: () => {
        this.toastr.success('Deleted successfully.');

        this.requests = (this.requests || []).filter((x: any) => (x.id ?? x.Id) !== c.id);
        this.myRequests = (this.myRequests || []).filter((x: any) => (x.id ?? x.Id) !== c.id);

        this.closeView();
      },
      error: (err: any) => {
        console.error('softDelete failed:', err);
        this.toastr.error('Failed to delete request.');
      }
    });
  }

  private buildViewDataFromRequest(req: any): any {
    const docType = this.normalizeDocType(req.documentType ?? req.DocumentType);
    const status = this.normalizeStatus(req.status ?? req.Status ?? 'Pending');

    const paymentMethod = (req.paymentMethod ?? req.PaymentMethod ?? 'Cash').toString();
    const gcashReferenceNumber = (req.gcashReferenceNumber ?? req.GcashReferenceNumber ?? '');

    const view: any = {
      documentType: docType,
      documentTypeLabel: this.getDocumentTypeLabel(docType),
      status,

      firstName: req.firstName ?? req.FirstName ?? '',
      lastName: req.lastName ?? req.LastName ?? '',

      email: req.email ?? req.Email ?? req.emailAddress ?? req.EmailAddress ?? '',
      copies: req.copies ?? req.Copies ?? req.numberOfCopies ?? req.NumberOfCopies ?? '—',

      paymentMethod,
      gcashReferenceNumber: gcashReferenceNumber || '',

      childName: '—',
      sacramentDate: '—',
      birthday: '—',
      purpose: '—',
      contact: '—',

      groom: '—',
      bride: '—',
      weddingDate: '—',
      weddingPlace: '—',

      deathName: '—',
      deathDate: '—',
      deathPlace: '—',
      relation: '—'
    };

    if (docType === 'baptismal' || docType === 'confirmation') {
      view.childName = req.childName ?? req.ChildName ?? '—';
      view.sacramentDate = req.sacramentDate ?? req.SacramentDate ?? req.documentDate ?? req.DocumentDate ?? '—';
      view.birthday = req.birthday ?? req.Birthday ?? req.dateOfBirth ?? req.DateOfBirth ?? '—';
      view.purpose = req.naPurpose ?? req.NaPurpose ?? req.purposeOfRequest ?? req.PurposeOfRequest ?? '—';
      view.contact = req.naContact ?? req.NaContact ?? req.contactPhone ?? req.ContactPhone ?? '—';
    }

    if (docType === 'wedding') {
      view.groom = req.groom ?? req.Groom ?? req.groomsFullName ?? req.GroomsFullName ?? '—';
      view.bride = req.bride ?? req.Bride ?? req.bridesFullName ?? req.BridesFullName ?? '—';
      view.weddingDate = req.weddingDate ?? req.WeddingDate ?? req.documentDate ?? req.DocumentDate ?? '—';
      view.weddingPlace = req.weddingPlace ?? req.WeddingPlace ?? req.address ?? req.Address ?? '—';
      view.purpose = req.wedPurpose ?? req.WedPurpose ?? req.purposeOfRequest ?? req.PurposeOfRequest ?? '—';
      view.contact = req.wedContact ?? req.WedContact ?? req.contactPhone ?? req.ContactPhone ?? '—';
    }

    if (docType === 'death') {
      view.deathName = req.deathName ?? req.DeathName ?? req.fullNameDeceased ?? req.FullNameDeceased ?? '—';
      view.deathDate = req.deathDate ?? req.DeathDate ?? req.documentDate ?? req.DocumentDate ?? '—';
      view.deathPlace = req.deathPlace ?? req.DeathPlace ?? req.address ?? req.Address ?? '—';
      view.relation = req.relation ?? req.Relation ?? req.relationRequestor ?? req.RelationRequestor ?? '—';
      view.purpose = req.deathPurpose ?? req.DeathPurpose ?? req.purposeOfRequest ?? req.PurposeOfRequest ?? '—';
      view.contact = req.deathContact ?? req.DeathContact ?? req.contactPhone ?? req.ContactPhone ?? '—';
    }

    return view;
  }

  // ---------------- REVIEW FLOW ----------------
  startReview(): void {
    if (this.requestForm.invalid) {
      this.toastr.warning('Please fill all required fields.');
      this.requestForm.markAllAsTouched();
      return;
    }

    const v = this.requestForm.value;

    // ✅ Make review modal match Scheduling modal style:
    // - a top description
    // - a single bordered "info card"
    // - rows generated by reviewRows (type-specific)
    this.reviewData = {
      ...v,
      documentTypeLabel: this.getDocumentTypeLabel(v.documentType),
      fullName: `${(v.firstName || '').trim()} ${(v.lastName || '').trim()}`.trim(),
      paymentMethod: v.paymentMethod || 'Cash',
      gcashReferenceNumber: v.gcashReferenceNumber || '',
      copies: v.copies || '1 Copy',
      email: v.email || ''
    };

    this.reviewRows = this.buildReviewRows(v);

    this.showReviewModal = true;
  }

  // ✅ builds consistent rows like Scheduling modal
  private buildReviewRows(v: any): ReviewRow[] {
    const docType = (v.documentType || '').toLowerCase();

    // base always shown
    const rows: ReviewRow[] = [
      { label: 'Document Type', value: this.getDocumentTypeLabel(v.documentType) },
      { label: 'Copies', value: v.copies || '—' },
      { label: 'Full Name', value: `${v.firstName || ''} ${v.lastName || ''}`.trim() || '—' },
      { label: 'Email', value: v.email || '—' },
      {
        label: 'Payment',
        value:
          (v.paymentMethod || 'Cash').toLowerCase() === 'gcash'
            ? `GCash • Ref#: ${v.gcashReferenceNumber || '—'}`
            : 'Cash'
      }
    ];

    // type-specific block (shown underneath as rows)
    if (docType === 'baptismal' || docType === 'confirmation') {
      rows.push(
        { label: 'Child Name', value: v.childName || '—' },
        { label: docType === 'baptismal' ? 'Baptismal Date' : 'Confirmation Date', value: v.sacramentDate || '—' },
        { label: 'Birthday', value: v.birthday || '—' },
        { label: 'Purpose', value: v.naPurpose || '—' },
        { label: 'Contact', value: v.naContact || '—' }
      );
    }

    if (docType === 'wedding') {
      rows.push(
        { label: 'Groom', value: v.groom || '—' },
        { label: 'Bride', value: v.bride || '—' },
        { label: 'Wedding Date', value: v.weddingDate || '—' },
        { label: 'Place/Parish', value: v.weddingPlace || '—' },
        { label: 'Purpose', value: v.wedPurpose || '—' },
        { label: 'Contact', value: v.wedContact || '—' }
      );
    }

    if (docType === 'death') {
      rows.push(
        { label: 'Deceased Name', value: v.deathName || '—' },
        { label: 'Death Date', value: v.deathDate || '—' },
        { label: 'Place of Death', value: v.deathPlace || '—' },
        { label: 'Relation', value: v.relation || '—' },
        { label: 'Purpose', value: v.deathPurpose || '—' },
        { label: 'Contact', value: v.deathContact || '—' }
      );
    }

    return rows;
  }

  backToEdit(): void {
    this.showReviewModal = false;
  }

  confirmAndSubmit(): void {
    this.showReviewModal = false;
    this.persistRequest();
  }

  // ---------------- SAVE / UPDATE ----------------
  private persistRequest(): void {
    if (this.requestForm.invalid) {
      this.toastr.warning('Form became invalid. Please check the fields.');
      this.requestForm.markAllAsTouched();
      return;
    }

    const v = this.requestForm.value;
    const nowIso = new Date().toISOString();

    let payload: any = {
      id: this.editingId ?? 0,
      documentType: v.documentType,

      firstName: v.firstName || '',
      lastName: v.lastName || '',

      emailAddress: v.email || '',
      numberOfCopies: v.copies || '1 Copy',

      paymentMethod: (v.paymentMethod || 'Cash'),
      gcashReferenceNumber:
        ((v.paymentMethod || '').toLowerCase() === 'gcash')
          ? (v.gcashReferenceNumber || '')
          : null,

      status: (v.status || 'Pending'),

      createdAt: this.selectedRequest?.createdAt || nowIso,
      modifiedAt: nowIso,
      createdBy: this.selectedRequest?.createdBy || 'user',
      modifiedBy: this.isAdmin ? 'admin' : 'user'
    };

    if (v.documentType === 'baptismal' || v.documentType === 'confirmation') {
      payload = {
        ...payload,
        childName: v.childName || '',
        dateOfBirth: v.birthday || null,
        documentDate: v.sacramentDate || null,
        purposeOfRequest: v.naPurpose || '',
        contactPhone: v.naContact || ''
      };
    }

    if (v.documentType === 'wedding') {
      payload = {
        ...payload,
        groomsFullName: v.groom || '',
        bridesFullName: v.bride || '',
        documentDate: v.weddingDate || null,
        address: v.weddingPlace || '',
        purposeOfRequest: v.wedPurpose || '',
        contactPhone: v.wedContact || ''
      };
    }

    if (v.documentType === 'death') {
      payload = {
        ...payload,
        fullNameDeceased: v.deathName || '',
        documentDate: v.deathDate || null,
        address: v.deathPlace || '',
        relationRequestor: v.relation || '',
        purposeOfRequest: v.deathPurpose || '',
        contactPhone: v.deathContact || ''
      };
    }

    if (this.editingId) {
      this.documentService.update(this.editingId, payload).subscribe({
        next: () => {
          this.toastr.success('Document request updated successfully.');
          this.loadRequests();
          this.clearForm();
        },
        error: (err: any) => {
          console.error('Update failed:', err);
          this.toastr.error('Failed to update document request.');
        }
      });
    } else {
      this.documentService.create(payload).subscribe({
        next: () => {
          this.toastr.success('Document request created successfully.');
          this.loadRequests();
          this.clearForm();
        },
        error: (err: any) => {
          console.error('Create failed:', err);
          this.toastr.error('Failed to create document request.');
        }
      });
    }
  }

  // ---------------- EDIT / CLEAR ----------------
  editRequest(req: Documentrequest): void {
    this.selectedRequest = req;
    this.editingId = (req as any).id;

    const docType = this.normalizeDocType((req as any).documentType);
    this.selectedType = docType;

    const paymentMethod = this.getPaymentMethod(req);
    const gcashRef = this.getGcashReferenceNumber(req);

    this.requestForm.patchValue({
      documentType: docType,
      firstName: (req as any).firstName || '',
      lastName: (req as any).lastName || '',
      email: (req as any).emailAddress || '',
      copies: (req as any).numberOfCopies || '1 Copy',

      paymentMethod,
      gcashReferenceNumber: gcashRef || '',
      status: this.normalizeStatus((req as any).status)
    });

    if (docType === 'baptismal' || docType === 'confirmation') {
      this.requestForm.patchValue({
        childName: (req as any).childName || '',
        sacramentDate: (req as any).documentDate || '',
        birthday: (req as any).dateOfBirth || '',
        naPurpose: (req as any).purposeOfRequest || '',
        naContact: (req as any).contactPhone || ''
      });
    }

    if (docType === 'wedding') {
      this.requestForm.patchValue({
        groom: (req as any).groomsFullName || '',
        bride: (req as any).bridesFullName || '',
        weddingDate: (req as any).documentDate || '',
        weddingPlace: (req as any).address || '',
        wedPurpose: (req as any).purposeOfRequest || '',
        wedContact: (req as any).contactPhone || ''
      });
    }

    if (docType === 'death') {
      this.requestForm.patchValue({
        deathName: (req as any).fullNameDeceased || '',
        deathDate: (req as any).documentDate || '',
        deathPlace: (req as any).address || '',
        relation: (req as any).relationRequestor || '',
        deathPurpose: (req as any).purposeOfRequest || '',
        deathContact: (req as any).contactPhone || ''
      });
    }

    this.showGcashDetails = paymentMethod.toLowerCase() === 'gcash';
    this.updateValidators();
  }

  clearForm(): void {
    this.requestForm.reset({
      documentType: '',
      firstName: '',
      lastName: '',
      email: '',
      copies: '1 Copy',
      paymentMethod: 'Cash',
      gcashReferenceNumber: '',
      status: 'Pending'
    });

    this.selectedRequest = null;
    this.editingId = null;
    this.selectedType = '';

    this.showReviewModal = false;
    this.reviewData = null;
    this.reviewRows = [];

    this.showGcashDetails = false;

    this.selectedDocFilter = 'all';
    this.selectedClaimedFilter = 'all';

    this.updateValidators();
  }

  // ---------------- VALIDATION ----------------
  updateValidators(): void {
    Object.keys(this.requestForm.controls).forEach((key) => {
      this.requestForm.get(key)?.clearValidators();
      this.requestForm.get(key)?.updateValueAndValidity({ emitEvent: false });
    });

    this.requestForm.get('documentType')?.setValidators([Validators.required]);
    this.requestForm.get('email')?.setValidators([Validators.required, Validators.email]);
    this.requestForm.get('copies')?.setValidators([Validators.required]);
    this.requestForm.get('firstName')?.setValidators([Validators.required]);
    this.requestForm.get('lastName')?.setValidators([Validators.required]);

    this.requestForm.get('paymentMethod')?.setValidators([Validators.required]);

    if (this.isGcash) {
      this.requestForm.get('gcashReferenceNumber')?.setValidators([
        Validators.required,
        Validators.pattern(/^[0-9]{8,20}$/)
      ]);
    }

    if (this.selectedType === 'baptismal' || this.selectedType === 'confirmation') {
      this.requestForm.get('childName')?.setValidators([Validators.required]);
      this.requestForm.get('sacramentDate')?.setValidators([Validators.required]);
      this.requestForm.get('birthday')?.setValidators([Validators.required]);
      this.requestForm.get('naPurpose')?.setValidators([Validators.required]);
      this.requestForm.get('naContact')?.setValidators([
        Validators.required,
        Validators.pattern(/^\+?[0-9]{10,15}$/)
      ]);
    }

    if (this.selectedType === 'wedding') {
      this.requestForm.get('groom')?.setValidators([Validators.required]);
      this.requestForm.get('bride')?.setValidators([Validators.required]);
      this.requestForm.get('weddingDate')?.setValidators([Validators.required]);
      this.requestForm.get('weddingPlace')?.setValidators([Validators.required]);
      this.requestForm.get('wedPurpose')?.setValidators([Validators.required]);
      this.requestForm.get('wedContact')?.setValidators([
        Validators.required,
        Validators.pattern(/^\+?[0-9]{10,15}$/)
      ]);
    }

    if (this.selectedType === 'death') {
      this.requestForm.get('deathName')?.setValidators([Validators.required]);
      this.requestForm.get('deathDate')?.setValidators([Validators.required]);
      this.requestForm.get('deathPlace')?.setValidators([Validators.required]);
      this.requestForm.get('relation')?.setValidators([Validators.required]);
      this.requestForm.get('deathPurpose')?.setValidators([Validators.required]);
      this.requestForm.get('deathContact')?.setValidators([
        Validators.required,
        Validators.pattern(/^\+?[0-9]{10,15}$/)
      ]);
    }

    Object.keys(this.requestForm.controls).forEach((key) => {
      this.requestForm.get(key)?.updateValueAndValidity({ emitEvent: false });
    });
  }

  // ---------------- LABEL ----------------
  getDocumentTypeLabel(type: string): string {
    switch ((type || '').toLowerCase()) {
      case 'baptismal': return 'Baptismal Certificate';
      case 'confirmation': return 'Confirmation Certificate';
      case 'wedding': return 'Wedding Certificate';
      case 'death': return 'Death Certificate';
      default: return type || 'Select Document Type';
    }
  }
}
