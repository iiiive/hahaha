export interface DonationReview {
    firstName: string;
    lastName: string;
    email: string | null;

    donationType: string;
    amount: number;

    referenceNo: string | null;
    remarks: string | null;
}
