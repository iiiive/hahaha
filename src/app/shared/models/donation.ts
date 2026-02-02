export interface Donation {
  donationId: number;
  userId?: number | null;

  amount: number;

  donationType: string;

  // ✅ exists in your DB: CustomDonationType
  customDonationType?: string | null;

  referenceNo?: string | null;
  remarks?: string | null;

  // ✅ ADD THIS (because backend DTO includes DonationDate)
  donationDate?: string | null;

  createdAt: string;
  modifiedAt?: string | null;
  createdBy?: number | null;
  modifiedBy?: number | null;
}
