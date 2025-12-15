export interface ServiceScheduleRequirement {
    id: number;
    serviceScheduleId: number;
    requirementType: string;
    filePath: string;
    createdBy: string;
    modifiedBy?: string;
    createdAt: string;
    modifiedAt?: string;
}
