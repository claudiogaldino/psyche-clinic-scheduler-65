
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import { usePayments } from "@/context/PaymentContext";
import { Appointment } from "@/types/appointment";
import { PaymentBatch } from "@/types/payment";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckSquare, XSquare, Eye, AlertTriangle } from "lucide-react";

const PaymentManagement = () => {
  const { appointments } = useAppointments();
  const { users, user } = useAuth();
  const { createPaymentBatch, paymentBatches, getPaymentItemsByBatch, contestPaymentBatch, markPaymentAsPaid } = usePayments();
  
  const [selectedPsychologist, setSelectedPsychologist] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [showBatchDetails, setShowBatchDetails] = useState<string | null>(null);
  const [contestReason, setContestReason] = useState("");
  const [showContestDialog, setShowContestDialog] = useState<string | null>(null);

  const psychologists = users.filter(u => u.role === "psychologist");
  
  // Get appointments for selected psychologist and date
  const getFilteredAppointments = () => {
    if (!selectedPsychologist || !selectedDate) return [];
    
    return appointments.filter(app => 
      app.psychologistId === selectedPsychologist &&
      app.date === selectedDate &&
      app.status === "confirmed" &&
      !paymentBatches.some(batch => 
        batch.appointmentIds.includes(app.id) && 
        (batch.status === 'pending' || batch.status === 'approved' || batch.status === 'paid')
      )
    );
  };

  const filteredAppointments = getFilteredAppointments();
  
  // Calculate totals for selected appointments
  const calculateTotals = () => {
    const selectedApps = filteredAppointments.filter(app => selectedAppointments.includes(app.id));
    const totalGross = selectedApps.reduce((sum, app) => sum + app.value, 0);
    const psychologist = psychologists.find(p => p.id === selectedPsychologist);
    const commissionPercentage = psychologist?.commissionPercentage || 50;
    const totalNet = selectedApps.reduce((sum, app) => sum + (app.value * commissionPercentage / 100), 0);
    
    return { totalGross, totalNet, commissionPercentage };
  };

  const { totalGross, totalNet, commissionPercentage } = calculateTotals();

  const handleSelectAppointment = (appointmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedAppointments(prev => [...prev, appointmentId]);
    } else {
      setSelectedAppointments(prev => prev.filter(id => id !== appointmentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAppointments(filteredAppointments.map(app => app.id));
    } else {
      setSelectedAppointments([]);
    }
  };

  const handleCreatePayment = () => {
    if (selectedAppointments.length === 0 || !user) return;
    
    const selectedApps = filteredAppointments.filter(app => selectedAppointments.includes(app.id));
    createPaymentBatch(selectedPsychologist, selectedApps, user);
    setSelectedAppointments([]);
  };

  const handleContestPayment = (batchId: string) => {
    if (contestReason.trim()) {
      contestPaymentBatch(batchId, contestReason);
      setShowContestDialog(null);
      setContestReason("");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800", 
      contested: "bg-red-100 text-red-800",
      paid: "bg-blue-100 text-blue-800"
    };
    
    const labels = {
      pending: "Pendente",
      approved: "Aprovado",
      contested: "Contestado",
      paid: "Pago"
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const psychologistBatches = paymentBatches.filter(batch => 
    !selectedPsychologist || batch.psychologistId === selectedPsychologist
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciamento de Pagamentos</h2>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Psicólogo</label>
              <Select value={selectedPsychologist} onValueChange={setSelectedPsychologist}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um psicólogo" />
                </SelectTrigger>
                <SelectContent>
                  {psychologists.map(psych => (
                    <SelectItem key={psych.id} value={psych.id}>
                      {psych.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Data</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {filteredAppointments.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedAppointments.length === filteredAppointments.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm">Selecionar todos</span>
                </div>
                <div className="text-sm text-gray-600">
                  Total: R$ {totalGross.toFixed(2)} | Líquido: R$ {totalNet.toFixed(2)} ({commissionPercentage}%)
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Valor Bruto</TableHead>
                      <TableHead>Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map(appointment => {
                      const commission = (appointment.value * commissionPercentage) / 100;
                      return (
                        <TableRow key={appointment.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedAppointments.includes(appointment.id)}
                              onCheckedChange={(checked) => handleSelectAppointment(appointment.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>{appointment.patient.name}</TableCell>
                          <TableCell>{appointment.startTime} - {appointment.endTime}</TableCell>
                          <TableCell>R$ {appointment.value.toFixed(2)}</TableCell>
                          <TableCell>R$ {commission.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <Button 
                onClick={handleCreatePayment}
                disabled={selectedAppointments.length === 0}
                className="w-full"
              >
                Criar Lote de Pagamento (R$ {totalNet.toFixed(2)})
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Batches */}
      <Card>
        <CardHeader>
          <CardTitle>Lotes de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Psicólogo</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead>Valor Líquido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {psychologistBatches.map(batch => (
                  <TableRow key={batch.id}>
                    <TableCell>{batch.psychologistName}</TableCell>
                    <TableCell>
                      {format(new Date(batch.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>R$ {batch.totalNetValue.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBatchDetails(batch.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {batch.status === 'approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markPaymentAsPaid(batch.id)}
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                        )}
                        {batch.status === 'contested' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowContestDialog(batch.id)}
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Batch Details Dialog */}
      <Dialog open={!!showBatchDetails} onOpenChange={() => setShowBatchDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Lote de Pagamento</DialogTitle>
          </DialogHeader>
          {showBatchDetails && (() => {
            const batch = paymentBatches.find(b => b.id === showBatchDetails);
            const items = getPaymentItemsByBatch(showBatchDetails);
            
            if (!batch) return null;
            
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Psicólogo</p>
                    <p className="font-medium">{batch.psychologistName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    {getStatusBadge(batch.status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Valor Total</p>
                    <p className="font-medium">R$ {batch.totalNetValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Criado por</p>
                    <p className="font-medium">{batch.createdByName}</p>
                  </div>
                </div>
                
                {batch.contestationReason && (
                  <div>
                    <p className="text-sm text-gray-500">Motivo da Contestação</p>
                    <p className="text-red-600">{batch.contestationReason}</p>
                  </div>
                )}
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor Bruto</TableHead>
                        <TableHead>Comissão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.patientName}</TableCell>
                          <TableCell>
                            {format(new Date(item.appointmentDate), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>R$ {item.grossValue.toFixed(2)}</TableCell>
                          <TableCell>R$ {item.netValue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Contest Dialog */}
      <Dialog open={!!showContestDialog} onOpenChange={() => setShowContestDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar Contestação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo da Contestação</label>
              <Textarea
                value={contestReason}
                onChange={(e) => setContestReason(e.target.value)}
                placeholder="Descreva as correções necessárias..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContestDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={() => showContestDialog && handleContestPayment(showContestDialog)}>
              Enviar Correção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentManagement;
