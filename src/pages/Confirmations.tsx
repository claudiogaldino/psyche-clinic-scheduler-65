
import Layout from "@/components/Layout";
import PendingConfirmations from "@/components/PendingConfirmations";
import AppointmentStatusDashboard from "@/components/AppointmentStatusDashboard";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Confirmations = () => {
  const { user } = useAuth();
  
  // Only admins and receptionists should access this page
  if (user?.role !== "admin" && user?.role !== "receptionist") {
    return <Navigate to="/" replace />;
  }
  
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold mb-6">Gestão de Confirmações</h1>
        
        <Tabs defaultValue="confirmations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="confirmations">Confirmações Pendentes</TabsTrigger>
            <TabsTrigger value="dashboard">Painel de Status</TabsTrigger>
          </TabsList>
          
          <TabsContent value="confirmations" className="mt-6">
            <PendingConfirmations />
          </TabsContent>
          
          <TabsContent value="dashboard" className="mt-6">
            <AppointmentStatusDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Confirmations;
