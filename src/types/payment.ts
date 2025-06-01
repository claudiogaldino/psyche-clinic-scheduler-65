
export type PaymentStatus = 'pending' | 'approved' | 'contested' | 'paid';

export interface PaymentBatch {
  id: string;
  psychologistId: string;
  psychologistName: string;
  createdBy: string; // admin/receptionist ID
  createdByName: string;
  createdAt: string;
  totalGrossValue: number;
  totalNetValue: number;
  status: PaymentStatus;
  contestationReason?: string;
  contestedAt?: string;
  approvedAt?: string;
  paidAt?: string;
  appointmentIds: string[];
}

export interface PaymentItem {
  id: string;
  paymentBatchId: string;
  appointmentId: string;
  appointmentDate: string;
  patientName: string;
  grossValue: number;
  commissionPercentage: number;
  netValue: number;
}

export interface PaymentDashboardData {
  totalPendingPayments: number;
  totalApprovedPayments: number;
  totalContestedPayments: number;
  totalPaidAmount: number;
  monthlyPayments: Array<{
    month: string;
    amount: number;
    psychologist: string;
  }>;
  psychologistPayments: Array<{
    psychologistName: string;
    totalPending: number;
    totalApproved: number;
    totalContested: number;
  }>;
}
