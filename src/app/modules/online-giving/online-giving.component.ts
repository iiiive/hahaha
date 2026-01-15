import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

  constructor(
    private fb: FormBuilder,
    private donationService: DonationService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.donationForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', Validators.email],

      donationType: ['Offering', Validators.required],
      donationTypeOther: [''],

      amount: [null, [Validators.required, Validators.min(1)]],
      customAmount: [null],

      referenceNo: [''],
      remarks: ['']
    });

    this.donationForm.get('donationType')?.valueChanges.subscribe((val: string) => {
      const otherCtrl = this.donationForm.get('donationTypeOther');
      if (!otherCtrl) return;

      if (val === 'Other') {
        otherCtrl.setValidators([Validators.required]);
      } else {
        otherCtrl.clearValidators();
        otherCtrl.setValue('');
      }

      otherCtrl.updateValueAndValidity({ emitEvent: false });
    });
  }

  selectPresetAmount(value: number): void {
    this.donationForm.patchValue({
      amount: value,
      customAmount: null
    });
  }

  useCustomAmount(): void {
    const custom = Number(this.donationForm.value.customAmount || 0);
    if (custom > 0) {
      this.donationForm.patchValue({ amount: custom });
    }
  }

  private ensureAmountIsValid(): boolean {
    this.useCustomAmount();
    const amount = Number(this.donationForm.value.amount || 0);
    return amount > 0;
  }

  private resolveDonationType(): string {
    const type = String(this.donationForm.value.donationType || '').trim();
    if (type === 'Other') {
      return String(this.donationForm.value.donationTypeOther || '').trim();
    }
    return type;
  }

  startReview(): void {
    if (this.donationForm.invalid) {
      this.donationForm.markAllAsTouched();
      this.toastr.warning('Please fill all required fields.');
      return;
    }

    if (!this.ensureAmountIsValid()) {
      this.toastr.warning('Please enter a valid amount.');
      return;
    }

    const finalType = this.resolveDonationType();
    if (!finalType) {
      this.toastr.warning('Please enter a donation type.');
      return;
    }

    this.reviewData = {
      firstName: this.donationForm.value.firstName,
      lastName: this.donationForm.value.lastName,
      email: this.donationForm.value.email || null,

      donationType: finalType,
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

    this.isSubmitting = true;

    const fullName = `${this.reviewData.firstName} ${this.reviewData.lastName}`.trim();
    const dateStr = new Date().toISOString().slice(0, 10);

    // store donor name for admin tracking
    const remarksValue = `${fullName} | GCash | ${dateStr}`;

    const payload = {
      amount: this.reviewData.amount,
      donationType: this.reviewData.donationType,
      referenceNo: this.reviewData.referenceNo || null,
      remarks: remarksValue
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
