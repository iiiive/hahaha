// src/app/shared/constants/donation-types.ts

export const FIXED_DONATION_TYPES = [
    'Offering',
    'Kapaldanan',
    'Kapasalamatan',
] as const;

export type FixedDonationType = typeof FIXED_DONATION_TYPES[number];

// Anything allowed because "Other" is free text
export type DonationType = FixedDonationType | string;

export const DONATION_TYPE_OPTIONS = [
    ...FIXED_DONATION_TYPES,
    'Other'
] as const;
