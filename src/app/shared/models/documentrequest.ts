export interface Documentrequest {
    id: number;
    documentType: string;

    firstName?: string;
    lastName?: string;

    /** DateOnly -> "yyyy-MM-dd" string */
    dateOfBirth?: string;

    contactPhone: string;
    emailAddress: string;

    purposeOfRequest?: string;
    numberOfCopies?: string;

    childName?: string;

    /** DateOnly -> "yyyy-MM-dd" string */
    documentDate?: string;

    groomsFullName?: string;
    bridesFullName?: string;

    address?: string;
    fullNameDeceased?: string;
    relationRequestor?: string;

    status?: string; // e.g. "Ready", "Processing", "Submitted"

    /** DateTime -> ISO string */
    createdAt: string;

    /** DateTime -> ISO string */
    modifiedAt?: string;

    createdBy: string;
    modifiedBy?: string;
}
