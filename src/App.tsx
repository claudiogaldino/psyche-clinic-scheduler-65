
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/ui/theme-provider";
import { AuthProvider } from "./context/AuthContext";
import { AppointmentProvider } from "./context/AppointmentContext";
import { PaymentProvider } from "./context/PaymentContext";
import { Toaster } from "./components/ui/toaster";
import LoginPage from "./pages/LoginPage";
import PrivateRoute from "./components/PrivateRoute";
import Index from "./pages/Index";
import Patients from "./pages/Patients";
import Users from "./pages/Users";
import Finance from "./pages/Finance";
import NotFound from "./pages/NotFound";
import Confirmations from "./pages/Confirmations";
import DatabaseSchema from "./pages/DatabaseSchema";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Criando a instância do QueryClient
const queryClient = new QueryClient();

const App = () => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <AppointmentProvider>
              <PaymentProvider>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    path="/"
                    element={
                      <PrivateRoute>
                        <Index />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/patients"
                    element={
                      <PrivateRoute>
                        <Patients />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <PrivateRoute allowedRoles={["admin", "receptionist"]}>
                        <Users />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/finance"
                    element={
                      <PrivateRoute allowedRoles={["admin", "receptionist", "psychologist"]}>
                        <Finance />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/confirmations"
                    element={
                      <PrivateRoute allowedRoles={["admin", "receptionist"]}>
                        <Confirmations />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/database-schema"
                    element={
                      <PrivateRoute allowedRoles={["admin"]}>
                        <DatabaseSchema />
                      </PrivateRoute>
                    }
                  />
                  <Route path="/404" element={<NotFound />} />
                  <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
                <Toaster />
              </PaymentProvider>
            </AppointmentProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
