// src/app/shared/constants/donation-types.ts

// ✅ Your fixed types + allow ANY custom text (for Other)
export const FIXED_DONATION_TYPES = [
    'Offering',
    'Kapaldanan',
    'Kapasalamatan',
] as const;

export type FixedDonationType = typeof FIXED_DONATION_TYPES[number];

// ✅ Anything is allowed because "Other" is free text
export type DonationType = FixedDonationType | string;

// ✅ for dropdowns in UI (with Other special option)
export const DONATION_TYPE_OPTIONS = [
    ...FIXED_DONATION_TYPES,
    'Other'
] as const;
