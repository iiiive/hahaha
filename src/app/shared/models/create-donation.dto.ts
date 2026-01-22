export interface CreateDonationDto {
    amount: number;
    donationType: string;
    referenceNo: string | null;
    remarks: string | null;

    // ✅ NEW: chosen date saved to donation_date (YYYY-MM-DD)
    donationDate?: string | null;
}
