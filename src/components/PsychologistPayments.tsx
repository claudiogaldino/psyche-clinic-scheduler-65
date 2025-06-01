
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { usePayments } from "@/context/PaymentContext";
import { PaymentBatch } from "@/types/payment";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckSquare, XSquare, Eye, AlertTriangle } from "lucide-react";

const PsychologistPayments = () => {
  const { user } = useAuth();
  const { getPsychologistPayments, getPaymentItemsByBatch, approvePaymentBatch, contestPaymentBatch } = usePayments();
  
  const [showBatchDetails, setShowBatchDetails] = useState<string | null>(null);
  const [showContestDialog, setShowContestDialog] = useState<string | null>(null);
  const [contestReason, setContestReason] = useState("");

  if (!user) return null;

  const myPayments = getPsychologistPayments(user.id);

  const handleApprovePayment = (batchId: string) => {
    approvePaymentBatch(batchId);
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
      pending: "Aguardando Aprovação",
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

  const getStatusDescription = (status: string) => {
    const descriptions = {
      pending: "Este pagamento foi criado pela administração e aguarda sua aprovação.",
      approved: "Você aprovou este pagamento. Aguarde o processamento pela administração.",
      contested: "Você contestou este pagamento. A administração irá revisar e fazer as correções necessárias.",
      paid: "Este pagamento foi processado e está finalizado."
    };
    
    return descriptions[status as keyof typeof descriptions];
  };

  // Calculate totals
  const totalPending = myPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.totalNetValue, 0);
  const totalApproved = myPayments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.totalNetValue, 0);
  const totalPaid = myPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.totalNetValue, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Meus Pagamentos</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Pendente de Aprovação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              R$ {totalPending.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Aprovado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totalApproved.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {totalPaid.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Batches */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {myPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum pagamento encontrado
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Criação</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado por</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myPayments.map(batch => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        {format(new Date(batch.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>R$ {batch.totalNetValue.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell>{batch.createdByName}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowBatchDetails(batch.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {batch.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprovePayment(batch.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowContestDialog(batch.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XSquare className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Details Dialog */}
      <Dialog open={!!showBatchDetails} onOpenChange={() => setShowBatchDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
          </DialogHeader>
          {showBatchDetails && (() => {
            const batch = myPayments.find(b => b.id === showBatchDetails);
            const items = getPaymentItemsByBatch(showBatchDetails);
            
            if (!batch) return null;
            
            return (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Status do Pagamento:</p>
                  {getStatusBadge(batch.status)}
                  <p className="text-sm text-gray-600 mt-2">
                    {getStatusDescription(batch.status)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Valor Total Bruto</p>
                    <p className="font-medium">R$ {batch.totalGrossValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sua Comissão</p>
                    <p className="font-medium text-green-600">R$ {batch.totalNetValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Criado por</p>
                    <p className="font-medium">{batch.createdByName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Data de Criação</p>
                    <p className="font-medium">
                      {format(new Date(batch.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                
                {batch.contestationReason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-1">Motivo da Contestação</p>
                    <p className="text-sm text-red-600">{batch.contestationReason}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium mb-2">Atendimentos Inclusos</p>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor Bruto</TableHead>
                          <TableHead>Sua Comissão</TableHead>
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
                            <TableCell className="text-green-600 font-medium">
                              R$ {item.netValue.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {batch.status === 'pending' && (
                  <div className="flex space-x-2 pt-4">
                    <Button
                      onClick={() => handleApprovePayment(batch.id)}
                      className="flex-1"
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Aprovar Pagamento
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowBatchDetails(null);
                        setShowContestDialog(batch.id);
                      }}
                      className="flex-1"
                    >
                      <XSquare className="h-4 w-4 mr-2" />
                      Contestar
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Contest Dialog */}
      <Dialog open={!!showContestDialog} onOpenChange={() => setShowContestDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contestar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Descreva o que está incorreto neste pagamento. Sua contestação será enviada para a administração para revisão.
            </p>
            <div>
              <label className="text-sm font-medium">Motivo da Contestação</label>
              <Textarea
                value={contestReason}
                onChange={(e) => setContestReason(e.target.value)}
                placeholder="Ex: Falta o atendimento do dia 15/01 com paciente João Silva..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContestDialog(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => showContestDialog && handleContestPayment(showContestDialog)}
              disabled={!contestReason.trim()}
            >
              Enviar Contestação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PsychologistPayments;
