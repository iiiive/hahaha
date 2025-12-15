import { ServiceScheduleRequirement } from "./service-schedule-requirement";

export interface ServiceSchedule {
  id: number;
  serviceType: string;
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  clientEmail: string;
  serviceDate: string; // DateTime -> ISO string
  serviceTime: string;
  partner1FullName: string;
  partner2FullName: string;
  specialRequests?: string;
  addressLine?: string;
  createdBy: string;
  modifiedBy?: string;
  createdAt: string;
  modifiedAt?: string;

  requirements?: ServiceScheduleRequirement[]; // child relation

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
