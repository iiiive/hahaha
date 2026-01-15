import { DonationType } from '../constants/donation-types';

export interface Donation {
    donationId: number;
    amount: number;
    donationType: DonationType;
    referenceNo?: string | null;
    remarks?: string | null;
    createdAt?: string;
}
