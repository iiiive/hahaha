export interface Donation {
    donationId: number;
    userId?: number | null;
    amount: number;
    donationType: string;
    referenceNo?: string | null;
    remarks?: string | null;

    // ✅ NEW: from donations.donation_date
    donationDate?: string | null;

    donorName?: string;
    paymentMethod?: string | null;
    status?: string | null;

    createdAt: string; // timestamp
}
