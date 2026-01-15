export interface CreateDonationDto {
    amount: number;
    donationType: string;
    referenceNo: string | null;
    remarks: string | null;
}
