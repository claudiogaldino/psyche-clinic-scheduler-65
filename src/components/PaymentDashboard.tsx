
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { usePayments } from "@/context/PaymentContext";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const PaymentDashboard = () => {
  const { dashboardData, paymentBatches } = usePayments();
  const { user } = useAuth();

  if (!user || user.role === 'psychologist') return null;

  // Prepare pie chart data for payment status
  const statusData = [
    { name: 'Pendentes', value: dashboardData.totalPendingPayments, color: '#FFBB28' },
    { name: 'Aprovados', value: dashboardData.totalApprovedPayments, color: '#00C49F' },
    { name: 'Contestados', value: dashboardData.totalContestedPayments, color: '#FF8042' },
  ].filter(item => item.value > 0);

  // Prepare bar chart data for psychologist payments
  const psychologistData = dashboardData.psychologistPayments.map(item => ({
    name: item.psychologistName.split(' ')[0], // First name only for better display
    pendente: item.totalPending,
    aprovado: item.totalApproved,
    contestado: item.totalContested,
    total: item.totalPending + item.totalApproved + item.totalContested
  }));

  // Recent payments
  const recentPayments = paymentBatches
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

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

  const totalValue = dashboardData.psychologistPayments.reduce(
    (sum, p) => sum + p.totalPending + p.totalApproved + p.totalContested, 0
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dashboard de Pagamentos</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Pagamentos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {dashboardData.totalPendingPayments}
            </div>
            <p className="text-xs text-gray-500">aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Pagamentos Aprovados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardData.totalApprovedPayments}
            </div>
            <p className="text-xs text-gray-500">prontos para pagamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Pagamentos Contestados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {dashboardData.totalContestedPayments}
            </div>
            <p className="text-xs text-gray-500">precisam revisão</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Total Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {dashboardData.totalPaidAmount.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">pagamentos finalizados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payments by Psychologist */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos por Psicólogo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={psychologistData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Valor"]} />
                  <Legend />
                  <Bar name="Pendente" dataKey="pendente" stackId="a" fill="#FFBB28" />
                  <Bar name="Aprovado" dataKey="aprovado" stackId="a" fill="#00C49F" />
                  <Bar name="Contestado" dataKey="contestado" stackId="a" fill="#FF8042" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Pagamentos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum pagamento encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {recentPayments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{payment.psychologistName}</p>
                    <p className="text-sm text-gray-500">
                      Criado por {payment.createdByName} • {new Date(payment.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">R$ {payment.totalNetValue.toFixed(2)}</p>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Total em Processamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalValue.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">soma de todos os pagamentos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Valor Médio por Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {paymentBatches.length > 0 ? (totalValue / paymentBatches.length).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-gray-500">média dos lotes de pagamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Psicólogos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.psychologistPayments.length}
            </div>
            <p className="text-xs text-gray-500">com pagamentos em andamento</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentDashboard;
