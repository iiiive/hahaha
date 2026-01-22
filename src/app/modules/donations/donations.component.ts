// src/app/modules/donations/donations.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { DonationService } from '../../core/services/donation.service';
import { Donation } from '../../shared/models/donation';
import { CreateDonationDto } from '../../shared/models/create-donation.dto';
import { AuthService } from '../../core/services/auth.service';

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

    // ✅ Pagination (SAFE: frontend only)
    pageSize = 10;
    currentPage = 1;

    get totalPages(): number {
        return Math.ceil(this.filtered.length / this.pageSize) || 1;
    }

    get pagedFiltered(): Donation[] {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filtered.slice(start, start + this.pageSize);
    }

    prevPage(): void {
        if (this.currentPage > 1) this.currentPage--;
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages) this.currentPage++;
    }

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
    cashOtherDonationType = '';
    cashDateStr = this.toDateInputValue(new Date());
    isSaving = false;

    // Edit modal
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

    // ✅ Use donationDate first, fallback to createdAt
    private getEffectiveDate(d: Donation): Date | null {
        const chosen = this.parseDate((d as any).donationDate);
        if (chosen) return chosen;
        return this.parseDate(d.createdAt);
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

    // ✅ Week label text for the cards
    weekRangeLabel(week: number): string {
        const y = this.selectedYear;
        const m = this.selectedMonthIndex;
        const lastDay = new Date(y, m + 1, 0).getDate();
        const monthShort = new Date(y, m, 1).toLocaleString('en-US', { month: 'short' });

        const ranges: Record<number, [number, number]> = {
            1: [1, Math.min(7, lastDay)],
            2: [8, Math.min(14, lastDay)],
            3: [15, Math.min(21, lastDay)],
            4: [22, lastDay],
        };

        const [s, e] = ranges[week] || [1, lastDay];
        return `${monthShort} ${s}–${e}`;
    }

    // --------- API ----------
    loadDonations(): void {
        this.donationService.getAll().subscribe({
            next: (items) => {
                this.donations = [...items].sort((a, b) => {
                    const ad = this.getEffectiveDate(a)?.getTime() ?? 0;
                    const bd = this.getEffectiveDate(b)?.getTime() ?? 0;
                    return bd - ad;
                });

                this.currentPage = 1; // ✅ reset page
                this.applyFilters();
            },
            error: (err) => {
                console.error('GET /donation failed:', err);
                this.toastr.error('Failed to load donations.');
            },
        });
    }

    // --------- filters ----------
    onMonthYearChange(): void {
        this.buildWeeks();
        this.selectedWeek = 0;
        this.currentPage = 1; // ✅ reset page
        this.applyFilters();
    }

    setWeek(week: number): void {
        this.selectedWeek = week;
        this.currentPage = 1; // ✅ reset page
        this.applyFilters();
    }

    setDonationTypeFilter(value: DonationTypeOption): void {
        this.donationTypeFilter = value;
        this.selectedWeek = 0;
        this.currentPage = 1; // ✅ reset page
        this.applyFilters();
    }

    applyFilters(): void {
        const start = this.monthStart;
        const endExcl = this.monthEndExclusive;

        let list = this.donations.filter((d) => {
            const dt = this.getEffectiveDate(d);
            if (!dt) return false;
            return dt >= start && dt < endExcl;
        });

        if (this.donationTypeFilter !== 'All Donations') {
            const fixed = ['offering', 'kapaldanan', 'kapasalamatan'];
            const dtStr = (x: any) => String(x?.donationType || '').trim().toLowerCase();

            if (this.donationTypeFilter === 'Other') {
                list = list.filter(d => {
                    const v = dtStr(d);
                    return !!v && !fixed.includes(v);
                });
            } else {
                const want = String(this.donationTypeFilter).trim().toLowerCase();
                list = list.filter(d => dtStr(d) === want);
            }
        }

        if (this.selectedWeek >= 1 && this.selectedWeek <= 4) {
            const wk = this.weeks[this.selectedWeek - 1];
            list = list.filter((d) => {
                const dt = this.getEffectiveDate(d);
                if (!dt) return false;
                return dt >= wk.start && dt <= wk.end;
            });
        }

        this.filtered = list;

        // ✅ keep page valid after filtering
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
        if (this.currentPage < 1) this.currentPage = 1;
    }

    get totalAmount(): number {
        return this.filtered.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    }

    getDonorName(d: Donation): string {
        const raw = (d.remarks || '').trim();
        if (!raw) return 'Guest';

        const parts = raw.split('|').map(x => x.trim());
        let name = parts[0] || 'Guest';
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

        let donationTypeFinal = this.cashDonationType;
        if (donationTypeFinal === 'Other') {
            const v = this.cashOtherDonationType.trim();
            if (!v) {
                this.toastr.warning('Please enter a custom donation type.');
                return;
            }
            donationTypeFinal = v as any;
        }

        const fullName = `${this.cashFirstName.trim()} ${this.cashLastName.trim()}`;
        const remarks = `${fullName} | Cash | ${this.cashDateStr}`;

        const payload: CreateDonationDto = {
            amount: this.cashAmount,
            donationType: donationTypeFinal as any,
            referenceNo: null,
            remarks,
            donationDate: this.cashDateStr, // ✅ saved to donation_date
        };

        this.isSaving = true;

        this.donationService.create(payload).subscribe({
            next: () => {
                this.toastr.success('Cash donation saved!');
                this.isSaving = false;
                this.showAddModal = false;
                this.loadDonations();
            },
            error: (err: any) => {
                console.error('POST /donation failed:', err);
                this.isSaving = false;
                this.toastr.error('Failed to save cash donation.');
            }
        });
    }

    // --------- Edit ----------
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
