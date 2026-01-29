import { ServiceScheduleRequirement } from "./service-schedule-requirement";

// ✅ Export this so components can import it
export type ScheduleStatus = 'Pending' | 'Approved' | 'Rejected' | 'Deleted';

export interface ServiceSchedule {
  id: number;

  serviceType: string;
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  clientEmail: string;

  serviceDate: string;
  serviceTime: string;

  partner1FullName: string;
  partner2FullName: string;

  specialRequests?: string;
  addressLine?: string;

  createdBy: string;
  modifiedBy?: string;
  createdAt: string;
  modifiedAt?: string;

  // ✅ IMPORTANT
  status?: ScheduleStatus | string;

  // ✅ Option A soft delete fields (backend sends these)
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;

  requirements?: ServiceScheduleRequirement[];

  // UI-only props
  colorClass?: string;
  badgeClass?: string;
  title?: string;
  dateTime?: string;
  contact?: string;
  fullDateTime?: Date;
  color?: string;
  bgColor?: string;
}
