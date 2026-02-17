import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { DonationService } from '../../core/services/donation.service';
import { DonationReview } from '../../shared/models/donation-review.model';
import { FIXED_DONATION_TYPES } from '../../shared/constants/donation-types';

@Component({
  selector: 'app-online-giving',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './online-giving.component.html',
  styleUrls: ['./online-giving.component.scss']
})
export class OnlineGivingComponent implements OnInit {
  donationForm!: FormGroup;

  showReviewModal = false;
  reviewData: DonationReview | null = null;

  isSubmitting = false;

  presetAmounts: number[] = [25, 50, 100, 250];

  // dropdown options (no tithe)
  donationTypeOptions = [...FIXED_DONATION_TYPES, 'Other'];

  // ✅ STRICT PATTERNS
  // "letters only" (realistic names): letters + spaces + apostrophe + hyphen
  private readonly namePattern = /^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/;
  private readonly gcash13Pattern = /^[0-9]{13}$/;

  constructor(
    private fb: FormBuilder,
    private donationService: DonationService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.donationForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.pattern(this.namePattern)]],
      lastName: ['', [Validators.required, Validators.pattern(this.namePattern)]],
      email: ['', Validators.email],

      donationType: ['Offering', Validators.required],
      donationTypeOther: [''],

      amount: [null, [Validators.required, Validators.min(1)]],
      customAmount: [null],

      // ✅ NOW STRICT: digits only + exactly 13 digits
      referenceNo: ['', [Validators.required, Validators.pattern(this.gcash13Pattern)]],
      remarks: ['']
    });

    this.donationForm.get('donationType')?.valueChanges.subscribe((val: string) => {
      const otherCtrl = this.donationForm.get('donationTypeOther');
      if (!otherCtrl) return;

      if (val === 'Other') {
        otherCtrl.setValidators([Validators.required, Validators.pattern(this.namePattern)]);
      } else {
        otherCtrl.clearValidators();
        otherCtrl.setValue('');
      }

      otherCtrl.updateValueAndValidity({ emitEvent: false });
    });
  }

  // ---------------- ✅ INPUT SANITIZERS (auto-clean paste/typing) ----------------
  onNameInput(controlName: string): void {
    const ctrl = this.donationForm.get(controlName);
    if (!ctrl) return;

    const raw = String(ctrl.value ?? '');
    // keep letters, space, apostrophe, hyphen only
    const cleaned = raw.replace(/[^A-Za-z '\-]/g, '');
    if (cleaned !== raw) {
      ctrl.setValue(cleaned, { emitEvent: false });
    }
  }

  onDigits13Input(controlName: string): void {
    const ctrl = this.donationForm.get(controlName);
    if (!ctrl) return;

    const raw = String(ctrl.value ?? '');
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 13); // digits only, max 13
    if (digitsOnly !== raw) {
      ctrl.setValue(digitsOnly, { emitEvent: false });
    }
  }

  // ✅ preset buttons should "enter" amount (fill the input + set real amount)
  selectPresetAmount(value: number): void {
    this.donationForm.patchValue({
      customAmount: value,   // so user sees it in the input
      amount: value
    });

    this.donationForm.get('customAmount')?.markAsTouched();
    this.donationForm.get('amount')?.markAsTouched();
  }

  // ✅ keep amount always synced with customAmount typing
  onCustomAmountInput(): void {
    const custom = Number(this.donationForm.value.customAmount || 0);
    this.donationForm.patchValue({ amount: custom > 0 ? custom : null }, { emitEvent: false });
  }

  // keep (button) behavior: still works if they press "Custom"
  useCustomAmount(): void {
    this.onCustomAmountInput();
  }

  private ensureAmountIsValid(): boolean {
    this.onCustomAmountInput();
    const amount = Number(this.donationForm.value.amount || 0);
    return amount > 0;
  }

  /**
   * ✅ IMPORTANT FIX:
   * Store donationType exactly like Cash Donations:
   * - if "Other": donationType="Other" + customDonationType="your label"
   * - else: donationType="<fixed>" + customDonationType=null
   */
  private resolveDonationType(): { donationType: string; customDonationType: string | null; displayType: string } {
    const type = String(this.donationForm.value.donationType || '').trim();

    if (type === 'Other') {
      const custom = String(this.donationForm.value.donationTypeOther || '').trim();
      return {
        donationType: 'Other',
        customDonationType: custom || null,
        displayType: custom || 'Other'
      };
    }

    return {
      donationType: type,
      customDonationType: null,
      displayType: type
    };
  }

  startReview(): void {
    // ✅ small safety: sanitize before validation check
    this.onNameInput('firstName');
    this.onNameInput('lastName');
    this.onNameInput('donationTypeOther');
    this.onDigits13Input('referenceNo');

    if (this.donationForm.invalid) {
      this.donationForm.markAllAsTouched();
      this.toastr.warning('Please fill all required fields correctly.');
      return;
    }

    if (!this.ensureAmountIsValid()) {
      this.toastr.warning('Please enter a valid amount.');
      return;
    }

    const resolved = this.resolveDonationType();
    if (!resolved.displayType || (resolved.donationType === 'Other' && !resolved.customDonationType)) {
      this.toastr.warning('Please enter a donation type.');
      return;
    }

    this.reviewData = {
      firstName: String(this.donationForm.value.firstName || '').trim(),
      lastName: String(this.donationForm.value.lastName || '').trim(),
      email: this.donationForm.value.email || null,

      donationType: resolved.displayType,
      amount: Number(this.donationForm.value.amount),

      referenceNo: this.donationForm.value.referenceNo || null,
      remarks: this.donationForm.value.remarks || null
    };

    this.showReviewModal = true;
  }

  backToEdit(): void {
    this.showReviewModal = false;
  }

  confirmAndSubmit(): void {
    if (!this.reviewData) return;

    // ✅ re-resolve again to ensure payload is correct
    const resolved = this.resolveDonationType();
    if (resolved.donationType === 'Other' && !resolved.customDonationType) {
      this.toastr.warning('Please enter a donation type.');
      return;
    }

    // ✅ safety sanitize (again)
    this.onDigits13Input('referenceNo');

    if (this.donationForm.get('referenceNo')?.invalid) {
      this.toastr.warning('GCash reference must be exactly 13 digits.');
      this.donationForm.get('referenceNo')?.markAsTouched();
      return;
    }

    this.isSubmitting = true;

    const fullName = `${this.reviewData.firstName} ${this.reviewData.lastName}`.trim();
    const dateStr = new Date().toISOString().slice(0, 10);

    // ✅ keep admin tracking format, but include intention safely after extra pipes
    const userNote = (this.reviewData.remarks || '').trim();
    const remarksValue = userNote
      ? `${fullName} | GCash | ${dateStr} | ${userNote}`
      : `${fullName} | GCash | ${dateStr}`;

    const payload: any = {
      amount: this.reviewData.amount,

      // ✅ FIX: store donationType properly (for filtering)
      donationType: resolved.donationType,

      // ✅ FIX: store custom label in customDonationType (for badge display)
      customDonationType: resolved.customDonationType,

      referenceNo: this.reviewData.referenceNo || null,
      remarks: remarksValue,

      // ✅ safe optional fields (ignored if backend doesn't have them)
      donationDate: dateStr,
      paymentMethod: 'GCash'
    };

    this.donationService.create(payload).subscribe({
      next: () => {
        this.toastr.success('Thank you for your donation!');
        this.isSubmitting = false;
        this.showReviewModal = false;
        this.reviewData = null;
        this.donationForm.reset();
      },
      error: (err: any) => {
        console.error('Donation error:', err);
        this.toastr.error('Failed to submit donation.');
        this.isSubmitting = false;
      }
    });
  }
}
