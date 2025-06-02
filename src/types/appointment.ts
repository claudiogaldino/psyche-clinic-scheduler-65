export interface ConsultingRoom {
  id: string;
  name: string;
  description?: string;
}

export interface Patient {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  address?: string;
  birthdate?: string;
  active: boolean;
  deactivationReason?: string;
  deactivationDate?: string;
  identityDocument?: File | string; // Added for identity document
  insuranceDocument?: File | string; // Added for insurance document
}

export type PaymentMethod = 'private' | 'insurance';
export type InsuranceType = 'Unimed' | 'SulAmérica' | 'Fusex' | 'Other' | null;
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'confirmed' | 'pending';
export type AppointmentType = 'presential' | 'online';
export type RecurrenceType = 'weekly' | 'biweekly' | null;

export interface Appointment {
  id: string;
  patient: Patient;
  psychologistId: string;
  psychologistName: string;
  roomId: string;
  roomName: string;
  date: string; // ISO date string
  startTime: string; // format: "HH:MM"
  endTime: string; // format: "HH:MM"
  status: AppointmentStatus;
  paymentMethod: PaymentMethod;
  insuranceType: InsuranceType;
  insuranceToken?: string; // Added for insurance token
  value: number;
  appointmentType: AppointmentType;
  isRecurring?: boolean; // Flag to indicate if this appointment is part of a recurring series
  recurrenceType?: RecurrenceType; // Type of recurrence (weekly, biweekly)
  recurrenceGroupId?: string; // ID to group recurring appointments
}

export interface PatientRecord {
  id: string;
  patientId: string;
  appointmentId: string;
  date: string; // ISO date string
  notes: string;
  createdBy: string; // psychologist ID
}

export interface PendingPatientsData {
  date: string;
  patients: Array<{
    name: string;
    phone: string;
    email: string;
    cpf: string;
    appointmentId: string;
    psychologistName: string;
    startTime: string;
  }>;
}
