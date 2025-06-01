
import React, { createContext, useContext, useState, useEffect } from 'react';
import { PaymentBatch, PaymentItem, PaymentDashboardData, PaymentStatus } from '@/types/payment';
import { Appointment } from '@/types/appointment';
import { User } from '@/types/user';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/use-toast';

interface PaymentContextType {
  paymentBatches: PaymentBatch[];
  paymentItems: PaymentItem[];
  dashboardData: PaymentDashboardData;
  createPaymentBatch: (psychologistId: string, appointments: Appointment[], createdBy: User) => void;
  approvePaymentBatch: (batchId: string) => void;
  contestPaymentBatch: (batchId: string, reason: string) => void;
  markPaymentAsPaid: (batchId: string) => void;
  getPaymentItemsByBatch: (batchId: string) => PaymentItem[];
  getPsychologistPayments: (psychologistId: string) => PaymentBatch[];
  refreshDashboard: () => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [paymentBatches, setPaymentBatches] = useState<PaymentBatch[]>([]);
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([]);
  const [dashboardData, setDashboardData] = useState<PaymentDashboardData>({
    totalPendingPayments: 0,
    totalApprovedPayments: 0,
    totalContestedPayments: 0,
    totalPaidAmount: 0,
    monthlyPayments: [],
    psychologistPayments: []
  });

  const createPaymentBatch = (psychologistId: string, appointments: Appointment[], createdBy: User) => {
    const batchId = uuidv4();
    
    // Calculate totals
    let totalGrossValue = 0;
    let totalNetValue = 0;
    
    const items: PaymentItem[] = appointments.map(appointment => {
      const grossValue = appointment.value;
      const commissionPercentage = 50; // Default, should come from psychologist data
      const netValue = (grossValue * commissionPercentage) / 100;
      
      totalGrossValue += grossValue;
      totalNetValue += netValue;
      
      return {
        id: uuidv4(),
        paymentBatchId: batchId,
        appointmentId: appointment.id,
        appointmentDate: appointment.date,
        patientName: appointment.patient.name,
        grossValue,
        commissionPercentage,
        netValue
      };
    });

    const batch: PaymentBatch = {
      id: batchId,
      psychologistId,
      psychologistName: appointments[0]?.psychologistName || '',
      createdBy: createdBy.id,
      createdByName: createdBy.name,
      createdAt: new Date().toISOString(),
      totalGrossValue,
      totalNetValue,
      status: 'pending',
      appointmentIds: appointments.map(a => a.id)
    };

    setPaymentBatches(prev => [...prev, batch]);
    setPaymentItems(prev => [...prev, ...items]);
    
    toast({
      title: "Lote de Pagamento Criado",
      description: `Pagamento de R$ ${totalNetValue.toFixed(2)} criado para ${batch.psychologistName}`,
    });
    
    refreshDashboard();
  };

  const approvePaymentBatch = (batchId: string) => {
    setPaymentBatches(prev => 
      prev.map(batch => 
        batch.id === batchId 
          ? { ...batch, status: 'approved' as PaymentStatus, approvedAt: new Date().toISOString() }
          : batch
      )
    );
    
    toast({
      title: "Pagamento Aprovado",
      description: "O lote de pagamento foi aprovado pelo psicólogo",
    });
    
    refreshDashboard();
  };

  const contestPaymentBatch = (batchId: string, reason: string) => {
    setPaymentBatches(prev => 
      prev.map(batch => 
        batch.id === batchId 
          ? { 
              ...batch, 
              status: 'contested' as PaymentStatus, 
              contestationReason: reason,
              contestedAt: new Date().toISOString()
            }
          : batch
      )
    );
    
    toast({
      title: "Pagamento Contestado",
      description: "O lote de pagamento foi contestado e retornará para revisão",
      variant: "destructive"
    });
    
    refreshDashboard();
  };

  const markPaymentAsPaid = (batchId: string) => {
    setPaymentBatches(prev => 
      prev.map(batch => 
        batch.id === batchId 
          ? { ...batch, status: 'paid' as PaymentStatus, paidAt: new Date().toISOString() }
          : batch
      )
    );
    
    toast({
      title: "Pagamento Realizado",
      description: "O pagamento foi marcado como pago",
    });
    
    refreshDashboard();
  };

  const getPaymentItemsByBatch = (batchId: string): PaymentItem[] => {
    return paymentItems.filter(item => item.paymentBatchId === batchId);
  };

  const getPsychologistPayments = (psychologistId: string): PaymentBatch[] => {
    return paymentBatches.filter(batch => batch.psychologistId === psychologistId);
  };

  const refreshDashboard = () => {
    const pending = paymentBatches.filter(b => b.status === 'pending').length;
    const approved = paymentBatches.filter(b => b.status === 'approved').length;
    const contested = paymentBatches.filter(b => b.status === 'contested').length;
    const totalPaid = paymentBatches
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + b.totalNetValue, 0);

    // Group by psychologist
    const psychologistGroups = paymentBatches.reduce((acc, batch) => {
      if (!acc[batch.psychologistName]) {
        acc[batch.psychologistName] = { pending: 0, approved: 0, contested: 0 };
      }
      
      if (batch.status === 'pending') acc[batch.psychologistName].pending += batch.totalNetValue;
      if (batch.status === 'approved') acc[batch.psychologistName].approved += batch.totalNetValue;
      if (batch.status === 'contested') acc[batch.psychologistName].contested += batch.totalNetValue;
      
      return acc;
    }, {} as Record<string, { pending: number; approved: number; contested: number }>);

    const psychologistPayments = Object.entries(psychologistGroups).map(([name, data]) => ({
      psychologistName: name,
      totalPending: data.pending,
      totalApproved: data.approved,
      totalContested: data.contested
    }));

    setDashboardData({
      totalPendingPayments: pending,
      totalApprovedPayments: approved,
      totalContestedPayments: contested,
      totalPaidAmount: totalPaid,
      monthlyPayments: [], // TODO: Implement monthly grouping
      psychologistPayments
    });
  };

  useEffect(() => {
    refreshDashboard();
  }, [paymentBatches]);

  return (
    <PaymentContext.Provider value={{
      paymentBatches,
      paymentItems,
      dashboardData,
      createPaymentBatch,
      approvePaymentBatch,
      contestPaymentBatch,
      markPaymentAsPaid,
      getPaymentItemsByBatch,
      getPsychologistPayments,
      refreshDashboard
    }}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayments = () => {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayments must be used within a PaymentProvider');
  }
  return context;
};
