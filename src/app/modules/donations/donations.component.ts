// src/app/modules/donations/donations.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { DonationService } from '../../core/services/donation.service';
import { Donation } from '../../shared/models/donation';
import { CreateDonationDto } from '../../shared/models/create-donation.dto';
import { AuthService } from '../../core/services/auth.service';

// ✅ Removed "Tithe", fixed spelling "KAPASALAMATAN", added "Other"
type DonationTypeOption =
    | 'All Donations'
    | 'Offering'
    | 'Kapaldanan'
    | 'KAPASALAMATAN'
    | 'Other';

@Component({
    selector: 'app-donations-admin',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './donations.component.html',
    styleUrls: ['./donations.component.scss'],
})
export class DonationsComponent implements OnInit {
    isAdmin = false;

    donations: Donation[] = [];
    filtered: Donation[] = [];

    months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    selectedMonthIndex = new Date().getMonth();
    selectedYear = new Date().getFullYear();

    donationTypeFilter: DonationTypeOption = 'All Donations';

    selectedWeek = 0; // 0 = all weeks
    weeks: { label: string; start: Date; end: Date }[] = [];

    // Add Cash Donation modal
    showAddModal = false;
    cashFirstName = '';
    cashLastName = '';
    cashAmount: number | null = null;

    cashDonationType: DonationTypeOption = 'Offering';
    cashOtherDonationType = ''; // ✅ if "Other"

    cashDateStr = this.toDateInputValue(new Date());
    isSaving = false;

    // ✅ Edit modal
    showEditModal = false;
    editDonationId: number | null = null;
    editFullName = '';
    editAmount: number | null = null;

    constructor(
        private donationService: DonationService,
        private toastr: ToastrService,
        private authService: AuthService
    ) {
        this.isAdmin = this.authService.isAdmin();
    }

    ngOnInit(): void {
        this.buildWeeks();
        this.loadDonations();
    }

    private toDateInputValue(d: Date) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    private parseDate(value?: string | null): Date | null {
        if (!value) return null;
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }

    private get monthStart(): Date {
        return new Date(this.selectedYear, this.selectedMonthIndex, 1, 0, 0, 0);
    }

    private get monthEndExclusive(): Date {
        return new Date(this.selectedYear, this.selectedMonthIndex + 1, 1, 0, 0, 0);
    }

    private buildWeeks(): void {
        const y = this.selectedYear;
        const m = this.selectedMonthIndex;
        const lastDay = new Date(y, m + 1, 0).getDate();

        const mk = (startDay: number, endDay: number, label: string) => ({
            label,
            start: new Date(y, m, startDay, 0, 0, 0),
            end: new Date(y, m, endDay, 23, 59, 59),
        });

        this.weeks = [
            mk(1, Math.min(7, lastDay), 'Week 1'),
            mk(8, Math.min(14, lastDay), 'Week 2'),
            mk(15, Math.min(21, lastDay), 'Week 3'),
            mk(22, lastDay, 'Week 4'),
        ];

        if (this.selectedWeek > 4) this.selectedWeek = 0;
    }

    // --------- API ----------
    loadDonations(): void {
        this.donationService.getAll().subscribe({
            next: (items) => {
                this.donations = [...items].sort((a, b) => {
                    const ad = this.parseDate(a.createdAt)?.getTime() ?? 0;
                    const bd = this.parseDate(b.createdAt)?.getTime() ?? 0;
                    return bd - ad;
                });
                this.applyFilters();
            },
            error: () => this.toastr.error('Failed to load donations.'),
        });
    }

    // --------- filters ----------
    onMonthYearChange(): void {
        this.buildWeeks();
        this.selectedWeek = 0;
        this.applyFilters();
    }

    setWeek(week: number): void {
        this.selectedWeek = week;
        this.applyFilters();
    }

    setDonationTypeFilter(value: DonationTypeOption): void {
        this.donationTypeFilter = value;
        this.selectedWeek = 0;
        this.applyFilters();
    }

    applyFilters(): void {
        const start = this.monthStart;
        const endExcl = this.monthEndExclusive;

        let list = this.donations.filter((d) => {
            const created = this.parseDate(d.createdAt);
            if (!created) return false;
            return created >= start && created < endExcl;
        });

        if (this.donationTypeFilter !== 'All Donations') {
            const want = this.donationTypeFilter.toLowerCase();
            list = list.filter((d) => (d.donationType || '').toLowerCase() === want);
        }

        if (this.selectedWeek >= 1 && this.selectedWeek <= 4) {
            const wk = this.weeks[this.selectedWeek - 1];
            list = list.filter((d) => {
                const created = this.parseDate(d.createdAt);
                if (!created) return false;
                return created >= wk.start && created <= wk.end;
            });
        }

        this.filtered = list;
    }

    get totalAmount(): number {
        return this.filtered.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    }

    // ✅ Display ONLY the name (no "Name:")
    getDonorName(d: Donation): string {
        const raw = (d.remarks || '').trim();

        // If remarks is empty, fallback:
        if (!raw) return 'Guest';

        // If remarks format: "Full Name | Cash | 2026-01-09"
        const parts = raw.split('|').map(x => x.trim());
        let name = parts[0] || 'Guest';

        // Remove unwanted "Name:" prefix if old data has it
        name = name.replace(/^name:\s*/i, '').trim();

        return name || 'Guest';
    }


    // --------- Add Cash Donation ----------
    openAddCashDonation(): void {
        this.cashFirstName = '';
        this.cashLastName = '';
        this.cashAmount = null;
        this.cashDonationType = 'Offering';
        this.cashOtherDonationType = '';
        this.cashDateStr = this.toDateInputValue(new Date());
        this.showAddModal = true;
    }

    closeAddModal(): void {
        this.showAddModal = false;
    }

    saveCashDonation(): void {
        if (!this.cashFirstName.trim() || !this.cashLastName.trim()) {
            this.toastr.warning('Please enter First Name and Last Name.');
            return;
        }
        if (!this.cashAmount || this.cashAmount <= 0) {
            this.toastr.warning('Please enter a valid amount.');
            return;
        }

        // ✅ Donation type final value
        let donationTypeFinal = this.cashDonationType;
        if (donationTypeFinal === 'Other') {
            const v = this.cashOtherDonationType.trim();
            if (!v) {
                this.toastr.warning('Please enter a custom donation type.');
                return;
            }
            donationTypeFinal = v as any; // stored as plain string
        }

        const fullName = `${this.cashFirstName.trim()} ${this.cashLastName.trim()}`;

        // ✅ remarks store the name ONLY first (so table shows it clean)
        const remarks = `${fullName} | Cash | ${this.cashDateStr}`;

        const payload: CreateDonationDto = {
            amount: this.cashAmount,
            donationType: donationTypeFinal as any,
            referenceNo: null,
            remarks,
            // ✅ IMPORTANT: If your Angular CreateDonationDto supports it, send paymentMethod:
            // paymentMethod: 'Cash'
        } as any;

        this.isSaving = true;

        this.donationService.create(payload).subscribe({
            next: () => {
                this.toastr.success('Cash donation saved!');
                this.isSaving = false;
                this.showAddModal = false;
                this.loadDonations();
            },
            error: (err: any) => {
                console.error(err);
                this.isSaving = false;
                this.toastr.error('Failed to save cash donation.');
            }
        });
    }

    // --------- Edit (name + amount) ----------
    openEdit(d: Donation): void {
        this.editDonationId = d.donationId ?? null;
        this.editFullName = this.getDonorName(d);
        this.editAmount = Number(d.amount) || null;
        this.showEditModal = true;
    }

    closeEdit(): void {
        this.showEditModal = false;
        this.editDonationId = null;
        this.editFullName = '';
        this.editAmount = null;
    }

    // ✅ Requires backend PUT/PATCH endpoint (I explain below)
    saveEdit(): void {
        if (!this.editDonationId) return;
        if (!this.editFullName.trim()) {
            this.toastr.warning('Please enter a name.');
            return;
        }
        if (!this.editAmount || this.editAmount <= 0) {
            this.toastr.warning('Please enter a valid amount.');
            return;
        }

        // Keep the original " | Cash | date" part if present
        const current = this.donations.find(x => x.donationId === this.editDonationId);
        const oldRemarks = (current?.remarks || '').trim();
        const suffix = oldRemarks.includes('|') ? oldRemarks.substring(oldRemarks.indexOf('|')) : '';

        const updatePayload = {
            amount: this.editAmount,
            remarks: `${this.editFullName.trim()}${suffix ? ' ' + suffix.trim() : ''}`,
        };

        this.donationService.update(this.editDonationId, updatePayload as any).subscribe({
            next: () => {
                this.toastr.success('Donation updated!');
                this.closeEdit();
                this.loadDonations();
            },
            error: (err: any) => {
                console.error(err);
                this.toastr.error('Failed to update donation.');
            }
        });
    }

    // --------- delete ----------
    deleteDonation(d: Donation): void {
        if (!d.donationId) return;
        if (!confirm('Delete this donation record?')) return;

        this.donationService.delete(d.donationId).subscribe({
            next: () => {
                this.toastr.success('Donation deleted.');
                this.donations = this.donations.filter(x => x.donationId !== d.donationId);
                this.applyFilters();
            },
            error: () => this.toastr.error('Failed to delete donation.')
        });
    }
}
