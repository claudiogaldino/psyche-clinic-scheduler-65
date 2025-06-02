import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { Download, Edit, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PaymentManagement from "./PaymentManagement";
import PsychologistPayments from "./PsychologistPayments";
import PaymentDashboard from "./PaymentDashboard";

type FilterPeriod = "day" | "week" | "month" | "year";

const FinanceCharts = () => {
  const { appointments, updateAppointment } = useAppointments();
  const { user, users } = useAuth();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");
  const [selectedPsychologist, setSelectedPsychologist] = useState<string>(
    user?.role === "psychologist" ? user.id : "all"
  );
  const [showReportTable, setShowReportTable] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [editAppointmentValue, setEditAppointmentValue] = useState<number>(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const isAdmin = user?.role === "admin";
  const isPsychologist = user?.role === "psychologist";
  
  // If user is a psychologist, they can only see their own data
  const effectivePsychologist = isPsychologist ? user?.id : selectedPsychologist;

  // Get all psychologists from the users context
  const psychologists = users.filter(u => u.role === "psychologist");

  // Filter appointments based on date, psychologist, and status
  const getFilteredAppointments = () => {
    let startDate: Date;
    const today = new Date();
    
    switch (filterPeriod) {
      case "day":
        startDate = new Date(today.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = startOfWeek(today, { weekStartsOn: 1 });
        break;
      case "month":
        startDate = startOfMonth(today);
        break;
      case "year":
        startDate = startOfYear(today);
        break;
      default:
        startDate = subDays(today, 30); // Default to last 30 days
    }
    
    return appointments.filter((app) => {
      const appDate = new Date(app.date);
      const matchesDate = appDate >= startDate;
      const matchesPsychologist = 
        effectivePsychologist === "all" || 
        app.psychologistId === effectivePsychologist;
      
      // Only include completed appointments (changed from "confirmed" to "completed")
      const isCompleted = app.status === "completed";
      
      return matchesDate && matchesPsychologist && isCompleted;
    });
  };
  
  const filteredAppointments = getFilteredAppointments();
  
  // Calculate total revenue and psychologist commission
  const calculateFinancials = () => {
    let totalRevenue = 0;
    let psychologistCommission = 0;
    let clinicRevenue = 0;

    filteredAppointments.forEach(app => {
      totalRevenue += app.value;
      
      // Find psychologist's commission percentage
      const psychologist = psychologists.find(p => p.id === app.psychologistId);
      const commissionPercentage = psychologist?.commissionPercentage || 50;
      
      // Calculate amounts
      const commission = (app.value * commissionPercentage) / 100;
      psychologistCommission += commission;
      clinicRevenue += (app.value - commission);
    });
    
    return { totalRevenue, psychologistCommission, clinicRevenue };
  };
  
  const { totalRevenue, psychologistCommission, clinicRevenue } = calculateFinancials();
  
  // Generate chart data
  const generateChartData = () => {
    if (filteredAppointments.length === 0) return [];
    
    // Group by date or by psychologist based on view
    if (effectivePsychologist === "all") {
      // Group by psychologist
      const dataByPsychologist = psychologists.map((psych) => {
        const psychAppointments = filteredAppointments.filter(
          (app) => app.psychologistId === psych.id
        );
        
        const totalValue = psychAppointments.reduce((sum, app) => sum + app.value, 0);
        const commissionPercentage = psych.commissionPercentage || 50;
        const commission = (totalValue * commissionPercentage) / 100;
        const clinicValue = totalValue - commission;
        
        return {
          name: psych.name,
          valor: totalValue,
          comissao: commission,
          clinica: clinicValue,
          consultas: psychAppointments.length,
        };
      });
      
      return dataByPsychologist;
    } else {
      // Group by date periods
      const dateGroups: Record<string, { date: string; valor: number; comissao: number; clinica: number; consultas: number }> = {};
      
      filteredAppointments.forEach((app) => {
        let groupKey: string;
        
        switch (filterPeriod) {
          case "day":
            groupKey = format(new Date(app.date), "HH:00", { locale: ptBR });
            break;
          case "week":
            groupKey = format(new Date(app.date), "EEE", { locale: ptBR });
            break;
          case "month":
            groupKey = format(new Date(app.date), "dd/MM", { locale: ptBR });
            break;
          case "year":
            groupKey = format(new Date(app.date), "MMM", { locale: ptBR });
            break;
          default:
            groupKey = app.date;
        }
        
        if (!dateGroups[groupKey]) {
          dateGroups[groupKey] = { date: groupKey, valor: 0, comissao: 0, clinica: 0, consultas: 0 };
        }
        
        // Find psychologist's commission percentage
        const psychologist = psychologists.find(p => p.id === app.psychologistId);
        const commissionPercentage = psychologist?.commissionPercentage || 50;
        
        // Calculate amounts
        const commission = (app.value * commissionPercentage) / 100;
        const clinicValue = app.value - commission;
        
        dateGroups[groupKey].valor += app.value;
        dateGroups[groupKey].comissao += commission;
        dateGroups[groupKey].clinica += clinicValue;
        dateGroups[groupKey].consultas += 1;
      });
      
      return Object.values(dateGroups);
    }
  };
  
  const chartData = generateChartData();
  
  // Get period name for display
  const getPeriodName = () => {
    switch (filterPeriod) {
      case "day":
        return "Hoje";
      case "week":
        return "Esta Semana";
      case "month":
        return "Este Mês";
      case "year":
        return "Este Ano";
      default:
        return "";
    }
  };

  // Handle edit appointment value
  const handleEditAppointment = (appointmentId: string, currentValue: number) => {
    setEditingAppointmentId(appointmentId);
    setEditAppointmentValue(currentValue);
    setIsEditModalOpen(true);
  };

  // Save edited appointment value
  const handleSaveAppointmentValue = () => {
    if (editingAppointmentId) {
      const appointment = appointments.find(a => a.id === editingAppointmentId);
      if (appointment) {
        const updatedAppointment = {
          ...appointment,
          value: editAppointmentValue
        };
        updateAppointment(updatedAppointment);
      }
    }
    setIsEditModalOpen(false);
    setEditingAppointmentId(null);
  };

  // Generate PDF report
  const generateReport = () => {
    const doc = new jsPDF();
    
    // Add title
    const title = `Relatório Financeiro - ${getPeriodName()}`;
    doc.setFontSize(18);
    doc.text(title, 14, 20);
    
    // Add subtitle with psychologist info if applicable
    let subtitle = "Todos os Psicólogos";
    if (effectivePsychologist !== "all") {
      const psych = psychologists.find(p => p.id === effectivePsychologist);
      subtitle = psych ? psych.name : "Psicólogo";
    }
    doc.setFontSize(14);
    doc.text(subtitle, 14, 30);
    
    // Add summary
    doc.setFontSize(12);
    doc.text(`Total de Consultas: ${filteredAppointments.length}`, 14, 40);
    doc.text(`Receita Total: R$ ${totalRevenue.toFixed(2)}`, 14, 47);
    
    if (isAdmin) {
      doc.text(`Receita da Clínica: R$ ${clinicRevenue.toFixed(2)}`, 14, 54);
      doc.text(`Comissões dos Psicólogos: R$ ${psychologistCommission.toFixed(2)}`, 14, 61);
      // Adjust starting Y for table
      var tableY = 68;
    } else {
      // Adjust starting Y for table if not admin
      var tableY = 54;
    }

    // Add date of generation
    doc.text(`Data de Geração: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, tableY);
    tableY += 7;
    
    // Generate table data
    const tableData = filteredAppointments.map(app => {
      const psychologist = psychologists.find(p => p.id === app.psychologistId);
      const commissionPercentage = psychologist?.commissionPercentage || 50;
      const commission = (app.value * commissionPercentage) / 100;
      
      return [
        app.patient.name,
        format(new Date(app.date), "dd/MM/yyyy", { locale: ptBR }),
        `${app.startTime} - ${app.endTime}`,
        `R$ ${app.value.toFixed(2)}`,
        `R$ ${commission.toFixed(2)} (${commissionPercentage}%)`,
        app.psychologistName
      ];
    });
    
    // Add table
    (doc as any).autoTable({
      startY: tableY,
      head: [['Paciente', 'Data', 'Horário', 'Valor', 'Comissão', 'Psicólogo']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 123, 255], textColor: 255 },
      styles: { fontSize: 10 },
    });
    
    // Save the document
    const reportName = `relatorio-financeiro-${filterPeriod}-${format(new Date(), 'yyyyMMdd', { locale: ptBR })}.pdf`;
    doc.save(reportName);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Finanças</h1>
      </div>
      
      <Tabs defaultValue={isPsychologist ? "payments" : "overview"}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="payments">
            {isPsychologist ? "Meus Pagamentos" : "Pagamentos"}
          </TabsTrigger>
          {isAdmin && <TabsTrigger value="management">Gerenciar Pagamentos</TabsTrigger>}
          {isAdmin && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="flex space-x-2 mb-4">
                <Button
                  variant={filterPeriod === "day" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterPeriod("day")}
                >
                  Dia
                </Button>
                <Button
                  variant={filterPeriod === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterPeriod("week")}
                >
                  Semana
                </Button>
                <Button
                  variant={filterPeriod === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterPeriod("month")}
                >
                  Mês
                </Button>
                <Button
                  variant={filterPeriod === "year" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterPeriod("year")}
                >
                  Ano
                </Button>
              </div>
              
              {isAdmin && (
                <div className="mb-4">
                  <Select
                    value={selectedPsychologist}
                    onValueChange={setSelectedPsychologist}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um psicólogo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Psicólogos</SelectItem>
                      {psychologists.map((psych) => (
                        <SelectItem key={psych.id} value={psych.id}>
                          {psych.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-1 md:col-span-1 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">
                    Receita Total ({getPeriodName()})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R$ {totalRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500">
                    {filteredAppointments.length} consultas realizadas
                  </p>
                </CardContent>
              </Card>
              
              {isAdmin && (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-500">
                        Receita da Clínica
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        R$ {clinicRevenue.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-500">
                        Comissões dos Psicólogos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        R$ {psychologistCommission.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
              
              {!isAdmin && isPsychologist && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">
                      Minha Comissão
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      R$ {psychologistCommission.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {user?.commissionPercentage || 50}% dos atendimentos
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>
                {effectivePsychologist === "all"
                  ? "Receita por Psicólogo"
                  : `Receita ${getPeriodName()}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={effectivePsychologist === "all" ? "name" : "date"} />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Valor"]}
                    />
                    <Legend />
                    <Bar
                      name="Valor Total (R$)"
                      dataKey="valor"
                      fill="#0ea5e9"
                      radius={[4, 4, 0, 0]}
                    />
                    {isAdmin && (
                      <>
                        <Bar
                          name="Receita da Clínica (R$)"
                          dataKey="clinica"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          name="Comissões (R$)"
                          dataKey="comissao"
                          fill="#6366f1"
                          radius={[4, 4, 0, 0]}
                        />
                      </>
                    )}
                    {isPsychologist && (
                      <Bar
                        name="Minha Comissão (R$)"
                        dataKey="comissao"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Relatório de Atendimentos</CardTitle>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowReportTable(!showReportTable)}
                >
                  {showReportTable ? "Ocultar Detalhes" : "Mostrar Detalhes"}
                </Button>
                <Button 
                  onClick={generateReport} 
                  className="flex items-center gap-1" 
                  size="sm"
                >
                  <Download className="h-4 w-4" /> Exportar PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showReportTable && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Psicólogo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        {isAdmin && <TableHead className="text-right">Comissão</TableHead>}
                        {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 7 : 5} className="text-center py-4 text-gray-500">
                            Nenhuma consulta realizada encontrada para este período
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAppointments.map((app) => {
                          const psychologist = psychologists.find(p => p.id === app.psychologistId);
                          const commissionPercentage = psychologist?.commissionPercentage || 50;
                          const commission = (app.value * commissionPercentage) / 100;
                          
                          return (
                            <TableRow key={app.id}>
                              <TableCell>{app.patient.name}</TableCell>
                              <TableCell>
                                {format(new Date(app.date), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                {app.startTime} - {app.endTime}
                              </TableCell>
                              <TableCell>{app.psychologistName}</TableCell>
                              <TableCell className="text-right font-medium">
                                R$ {app.value.toFixed(2)}
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right font-medium">
                                  R$ {commission.toFixed(2)} ({commissionPercentage}%)
                                </TableCell>
                              )}
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditAppointment(app.id, app.value)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          
          {isAdmin && effectivePsychologist !== "all" && (
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Psicólogo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Profissional:</p>
                    <p className="font-medium">
                      {psychologists.find(p => p.id === effectivePsychologist)?.name || ""}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total de Consultas:</p>
                      <p className="font-medium">{filteredAppointments.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Média por Consulta:</p>
                      <p className="font-medium">
                        R$ {filteredAppointments.length > 0
                          ? (totalRevenue / filteredAppointments.length).toFixed(2)
                          : "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Percentual de Comissão:</p>
                      <p className="font-medium">
                        {psychologists.find(p => p.id === effectivePsychologist)?.commissionPercentage || 50}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Receita Total:</p>
                      <p className="font-medium">R$ {totalRevenue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Comissão Total:</p>
                      <p className="font-medium">R$ {psychologistCommission.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Receita da Clínica:</p>
                      <p className="font-medium">R$ {clinicRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit Appointment Value Modal */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Valor da Consulta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Novo Valor (R$):</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editAppointmentValue}
                    onChange={(e) => setEditAppointmentValue(Number(e.target.value))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveAppointmentValue} className="flex items-center gap-1">
                  <Save className="h-4 w-4" /> Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="payments">
          {isPsychologist ? <PsychologistPayments /> : <PaymentManagement />}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="management">
            <PaymentManagement />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="dashboard">
            <PaymentDashboard />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default FinanceCharts;
