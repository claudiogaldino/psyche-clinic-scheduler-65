import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Appointment } from "@/types/appointment";
import { useAuth } from "@/context/AuthContext";
import { useAppointments } from "@/context/AppointmentContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Clock, CheckCircle, XCircle, Calendar, Edit3, CheckSquare } from "lucide-react";
import PsychologistAvailabilityDatePicker from "./PsychologistAvailabilityDatePicker";

interface AppointmentDetailsProps {
  appointment: Appointment;
  onClose: () => void;
}

const AppointmentDetails = ({ appointment, onClose }: AppointmentDetailsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { updateAppointmentStatus, deleteAppointment, findNextAvailableSlot, rescheduleAppointment, updateAppointment } = useAppointments();
  const [isReschedulingOpen, setIsReschedulingOpen] = useState(false);
  const [newDate, setNewDate] = useState<Date>(new Date(appointment.date));
  const [newStartTime, setNewStartTime] = useState<string>(appointment.startTime);
  const [newEndTime, setNewEndTime] = useState<string>(appointment.endTime);
  const [isEditingToken, setIsEditingToken] = useState<boolean>(!appointment.insuranceToken);
  const [tokenValue, setTokenValue] = useState<string>(appointment.insuranceToken || "");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const formattedDate = format(new Date(appointment.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const isPsychologist = user?.role === "psychologist";
  const canManage = isAdmin || isReceptionist || isPsychologist;
  const canEditToken = isAdmin || isReceptionist || isPsychologist;
  
  // Determine if we should show token section (for insurance appointments that are pending OR confirmed)
  const shouldShowTokenSection = appointment.paymentMethod === "insurance" && 
    (appointment.status === "pending" || appointment.status === "confirmed") && 
    canEditToken;

  const handleStatusChange = (status: "pending" | "confirmed" | "cancelled") => {
    if (status === "cancelled") {
      setShowCancelConfirm(true);
      return;
    }
    updateAppointmentStatus(appointment.id, status);
  };

  const handleConfirmCancel = () => {
    updateAppointmentStatus(appointment.id, "cancelled");
    setShowCancelConfirm(false);
    onClose();
    toast({
      title: "Agendamento cancelado",
      description: `O agendamento de ${appointment.patient.name} foi cancelado com sucesso.`,
    });
  };

  const handleDelete = () => {
    setShowCancelConfirm(true);
  };

  const handleOpenReschedule = () => {
    // Encontra o próximo horário disponível para o psicólogo
    const nextSlot = findNextAvailableSlot(appointment.psychologistId);
    
    if (nextSlot) {
      setNewDate(nextSlot.date);
      setNewStartTime(nextSlot.startTime);
      setNewEndTime(nextSlot.endTime);
    }
    
    setIsReschedulingOpen(true);
  };

  const handleReschedule = () => {
    const newDateString = format(newDate, 'yyyy-MM-dd');
    rescheduleAppointment(appointment.id, newDateString, newStartTime, newEndTime);
    setIsReschedulingOpen(false);
  };

  const handleSaveToken = () => {
    const updatedAppointment = {
      ...appointment,
      insuranceToken: tokenValue
    };
    updateAppointment(updatedAppointment);
    setIsEditingToken(false);
    
    toast({
      title: "Token salvo",
      description: "O token do convênio foi salvo com sucesso.",
    });
  };

  const handleEditToken = () => {
    setIsEditingToken(true);
  };

  const handleAttendanceCompleted = () => {
    // Check if it's an insurance appointment and token is required
    if (appointment.paymentMethod === "insurance" && !appointment.insuranceToken) {
      toast({
        title: "Token obrigatório",
        description: "Para atendimentos de convênio é obrigatório informar o token antes de marcar como realizado.",
        variant: "destructive"
      });
      return;
    }

    updateAppointmentStatus(appointment.id, "completed");
    onClose();
    toast({
      title: "Atendimento concluído",
      description: `O atendimento de ${appointment.patient.name} foi marcado como realizado.`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "text-green-700 bg-green-100";
      case "pending":
        return "text-yellow-700 bg-yellow-100";
      case "cancelled":
        return "text-red-700 bg-red-100";
      case "completed":
        return "text-blue-700 bg-blue-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmado";
      case "pending":
        return "Pendente";
      case "cancelled":
        return "Cancelado";
      case "completed":
        return "Concluído";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Paciente</p>
          <p className="font-medium">{appointment.patient.name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Data</p>
          <p className="font-medium">{formattedDate}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Horário</p>
          <p className="font-medium">{appointment.startTime} - {appointment.endTime}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Psicólogo</p>
          <p className="font-medium">{appointment.psychologistName}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Sala</p>
          <p className="font-medium">{appointment.roomName}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Método de Pagamento</p>
          <p className="font-medium">
            {appointment.paymentMethod === "private" ? "Particular" : `Convênio (${appointment.insuranceType})`}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Valor</p>
          <p className="font-medium">R$ {appointment.value.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Status</p>
          <div className="flex items-center mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
              {getStatusText(appointment.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Token section for insurance plans */}
      {shouldShowTokenSection && (
        <div className="pt-4 border-t border-gray-200">
          <div className="space-y-3">
            <Label htmlFor="insuranceToken">Token do Plano de Saúde</Label>
            {isEditingToken ? (
              <div className="flex space-x-2">
                <Input
                  id="insuranceToken"
                  value={tokenValue}
                  onChange={(e) => setTokenValue(e.target.value)}
                  placeholder="Digite o código de autorização"
                  className="flex-1"
                />
                <Button onClick={handleSaveToken} className="whitespace-nowrap">
                  Salvar
                </Button>
                {appointment.insuranceToken && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditingToken(false);
                      setTokenValue(appointment.insuranceToken || "");
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                <span className="flex-1 font-mono text-sm">
                  {appointment.insuranceToken || "Nenhum token cadastrado"}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleEditToken}
                  className="flex items-center space-x-1"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Editar</span>
                </Button>
              </div>
            )}
            <p className="text-xs text-gray-500">
              O token é importante para controle e rastreamento dos atendimentos realizados via convênio.
            </p>
          </div>
        </div>
      )}

      {canManage && (
        <div className="pt-4 border-t border-gray-200">
          <div className="space-y-4">
            <Label>Atualizar Status</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={appointment.status === "pending" ? "default" : "outline"}
                onClick={() => handleStatusChange("pending")}
                className="flex items-center space-x-2"
                size="sm"
              >
                <Clock className="h-4 w-4" />
                <span>Pendente</span>
              </Button>
              <Button
                variant={appointment.status === "confirmed" ? "default" : "outline"}
                onClick={() => handleStatusChange("confirmed")}
                className="flex items-center space-x-2"
                size="sm"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Confirmado</span>
              </Button>
              <Button
                variant={appointment.status === "cancelled" ? "destructive" : "outline"}
                onClick={() => handleStatusChange("cancelled")}
                className="flex items-center space-x-2"
                size="sm"
              >
                <XCircle className="h-4 w-4" />
                <span>Cancelado</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenReschedule}
                className="flex items-center space-x-2"
                size="sm"
              >
                <Calendar className="h-4 w-4" />
                <span>Reagendar</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        {canManage && (
          <Button 
            variant="default" 
            onClick={handleAttendanceCompleted}
            className="flex items-center space-x-2"
          >
            <CheckSquare className="h-4 w-4" />
            <span>Atendimento Realizado</span>
          </Button>
        )}
        <Button onClick={onClose}>Fechar</Button>
      </div>

      {/* Modal de confirmação de cancelamento */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar o agendamento de <strong>{appointment.patient.name}</strong> 
              para o dia {formattedDate} às {appointment.startTime}?
              <br /><br />
              Esta ação não pode ser desfeita e o paciente será removido do agendamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, manter agendamento</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} className="bg-red-600 hover:bg-red-700">
              Sim, cancelar agendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de reagendamento com calendário de disponibilidade */}
      <Dialog open={isReschedulingOpen} onOpenChange={setIsReschedulingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reagendar Consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newDate">Selecione uma nova data disponível</Label>
              <p className="text-sm text-gray-500 mb-2">
                Psicólogo: {appointment.psychologistName}
              </p>
              <PsychologistAvailabilityDatePicker
                date={newDate}
                onDateChange={setNewDate}
                psychologistId={appointment.psychologistId}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="newStartTime">Horário de Início</Label>
                <Input
                  id="newStartTime"
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newEndTime">Horário de Término</Label>
                <Input
                  id="newEndTime"
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsReschedulingOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleReschedule}>
                Confirmar Reagendamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentDetails;
