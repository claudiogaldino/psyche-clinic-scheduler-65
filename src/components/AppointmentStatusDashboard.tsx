
import { useState } from "react";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Appointment } from "@/types/appointment";

type PeriodFilter = "today" | "week" | "month" | "year";

const AppointmentStatusDashboard = () => {
  const { appointments } = useAppointments();
  const { users } = useAuth();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month");
  const [showDetailsModal, setShowDetailsModal] = useState<{
    status: string;
    appointments: Appointment[];
  } | null>(null);

  const psychologists = users.filter(u => u.role === "psychologist");

  // Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    
    switch (periodFilter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "year":
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getDateRange();

  // Filter appointments by period
  const filteredAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.date);
    return appointmentDate >= start && appointmentDate <= end;
  });

  // Calculate statistics
  const calculateStats = () => {
    const pending = filteredAppointments.filter(a => a.status === "pending");
    const confirmed = filteredAppointments.filter(a => a.status === "confirmed");
    const cancelled = filteredAppointments.filter(a => a.status === "cancelled");
    const completed = filteredAppointments.filter(a => a.status === "completed");

    // Count rescheduled appointments (simplified - in real app would track this better)
    const rescheduled = filteredAppointments.filter(a => 
      a.isRecurring && a.recurrenceType // Basic proxy for rescheduled
    );

    return {
      pending: { count: pending.length, appointments: pending },
      confirmed: { count: confirmed.length, appointments: confirmed },
      cancelled: { count: cancelled.length, appointments: cancelled },
      completed: { count: completed.length, appointments: completed },
      rescheduled: { count: rescheduled.length, appointments: rescheduled },
      total: filteredAppointments.length
    };
  };

  const stats = calculateStats();

  // Prepare chart data
  const chartData = [
    { name: "Pendente", count: stats.pending.count, color: "#fbbf24" },
    { name: "Confirmado", count: stats.confirmed.count, color: "#10b981" },
    { name: "Cancelado", count: stats.cancelled.count, color: "#ef4444" },
    { name: "Realizado", count: stats.completed.count, color: "#3b82f6" },
    { name: "Reagendado", count: stats.rescheduled.count, color: "#8b5cf6" }
  ];

  const pieData = chartData.filter(item => item.count > 0);

  const handleShowDetails = (status: string, appointments: Appointment[]) => {
    setShowDetailsModal({ status, appointments });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      completed: "bg-blue-100 text-blue-800"
    };
    
    const labels = {
      pending: "Pendente",
      confirmed: "Confirmado",
      cancelled: "Cancelado",
      completed: "Realizado"
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getPeriodText = () => {
    switch (periodFilter) {
      case "today":
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Painel de Status dos Atendimentos</h2>
        <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="year">Este Ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => handleShowDetails("pending", stats.pending.appointments)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-600">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{stats.pending.count}</div>
            <p className="text-xs text-gray-500">Aguardando confirmação</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleShowDetails("confirmed", stats.confirmed.appointments)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-600">Confirmados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.confirmed.count}</div>
            <p className="text-xs text-gray-500">Confirmados pelo paciente</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleShowDetails("cancelled", stats.cancelled.appointments)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600">Cancelados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.cancelled.count}</div>
            <p className="text-xs text-gray-500">Cancelados</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleShowDetails("completed", stats.completed.appointments)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-600">Realizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.completed.count}</div>
            <p className="text-xs text-gray-500">Atendimentos realizados</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleShowDetails("rescheduled", stats.rescheduled.appointments)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-600">Reagendados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.rescheduled.count}</div>
            <p className="text-xs text-gray-500">Reagendamentos</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status dos Atendimentos - {getPeriodText()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Modal */}
      <Dialog open={!!showDetailsModal} onOpenChange={() => setShowDetailsModal(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Detalhes - {showDetailsModal?.status === "pending" ? "Pendentes" : 
                         showDetailsModal?.status === "confirmed" ? "Confirmados" :
                         showDetailsModal?.status === "cancelled" ? "Cancelados" :
                         showDetailsModal?.status === "completed" ? "Realizados" : "Reagendados"}
              ({showDetailsModal?.appointments.length || 0} atendimentos)
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Psicólogo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showDetailsModal?.appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>{appointment.patient.name}</TableCell>
                    <TableCell>
                      {format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{appointment.startTime} - {appointment.endTime}</TableCell>
                    <TableCell>{appointment.psychologistName}</TableCell>
                    <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                    <TableCell>R$ {appointment.value.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentStatusDashboard;
