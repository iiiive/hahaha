export interface CreateDonationDto {
  amount: number;

  donationType: string;

  customDonationType?: string | null;

  referenceNo?: string | null;
  remarks?: string | null;

  donationDate?: string | null; // yyyy-mm-dd
}
