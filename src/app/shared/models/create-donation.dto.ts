export interface CreateDonationDto {
  amount: number;

  // Offering / Kapaldanan / KAPASALAMATAN / Other
  donationType: string;

  // only when donationType == "Other"
  customDonationType?: string | null;

  referenceNo?: string | null;
  remarks?: string | null;
}
