
import React, { createContext, useState, useContext, ReactNode } from "react";
import { User, UserRole, WorkingHours } from "../types/user";
import { useToast } from "@/components/ui/use-toast";

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (usernameOrEmail: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  addUser: (userData: Omit<User, "id">) => User;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  getUserById: (id: string) => User | undefined;
  getPsychologists: () => User[];
  changePassword: (userId: string, newPassword: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const initialUsers: User[] = [
  { id: "1", name: "Admin User", email: "admin@example.com", role: "admin", username: "admin", password: "password" },
  { id: "2", name: "Receptionist User", email: "receptionist@example.com", role: "receptionist", username: "recepcao", password: "password" },
  { 
    id: "3", 
    name: "Dr. John Smith", 
    email: "john@example.com", 
    role: "psychologist",
    phone: "(11) 99999-8888",
    username: "drjohn",
    password: "password",
    workingHours: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
      { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" }
    ],
    commissionPercentage: 50
  },
  { 
    id: "4", 
    name: "Dr. Sarah Johnson", 
    email: "sarah@example.com", 
    role: "psychologist",
    phone: "(11) 99888-7777",
    username: "drsarah",
    password: "password",
    workingHours: [
      { dayOfWeek: 2, startTime: "13:00", endTime: "19:00" },
      { dayOfWeek: 4, startTime: "13:00", endTime: "19:00" }
    ],
    commissionPercentage: 40
  },
  { 
    id: "5", 
    name: "Dr. Claudio Silva", 
    email: "claudio@example.com", 
    role: "psychologist",
    phone: "(11) 98765-4321",
    username: "claudio",
    password: "claudio",
    workingHours: [
      { dayOfWeek: 1, startTime: "08:00", endTime: "17:00" },
      { dayOfWeek: 2, startTime: "08:00", endTime: "17:00" },
      { dayOfWeek: 4, startTime: "08:00", endTime: "17:00" },
      { dayOfWeek: 5, startTime: "08:00", endTime: "17:00" }
    ],
    commissionPercentage: 60
  }
];

// Function to generate random ID
const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [users, setUsers] = useState<User[]>(initialUsers);
  const { toast } = useToast();

  const login = async (usernameOrEmail: string, password: string): Promise<boolean> => {
    // In a real app, this would be an API call
    const foundUser = users.find(u => 
      (u.email === usernameOrEmail || u.username === usernameOrEmail)
    );
    
    if (foundUser && foundUser.password === password) {
      // Remove senha antes de salvar no estado
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem("user", JSON.stringify(userWithoutPassword));
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo(a), ${foundUser.name}!`,
      });
      return true;
    } else {
      toast({
        title: "Falha no login",
        description: "Usuário ou senha inválidos",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    toast({
      title: "Desconectado",
      description: "Você foi desconectado com sucesso",
    });
  };

  const addUser = (userData: Omit<User, "id">): User => {
    const newUser: User = {
      id: generateId(),
      ...userData
    };
    setUsers(prev => [...prev, newUser]);
    toast({
      title: "Usuário adicionado",
      description: `O usuário ${userData.name} foi adicionado.`
    });
    return newUser;
  };

  const updateUser = (user: User) => {
    setUsers(prev => 
      prev.map(u => {
        if (u.id === user.id) {
          // Se a senha não estiver presente no objeto user, mantenha a senha atual
          if (!user.password && u.password) {
            return { ...user, password: u.password };
          }
          return user;
        }
        return u;
      })
    );
    toast({
      title: "Usuário atualizado",
      description: `O usuário ${user.name} foi atualizado.`
    });
  };

  const deleteUser = (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    
    setUsers(prev => prev.filter(u => u.id !== id));
    if (userToDelete) {
      toast({
        title: "Usuário excluído",
        description: `O usuário ${userToDelete.name} foi removido.`
      });
    }
  };

  const getUserById = (id: string) => {
    return users.find(user => user.id === id);
  };

  const getPsychologists = () => {
    return users.filter(user => user.role === "psychologist");
  };

  const changePassword = (userId: string, newPassword: string): boolean => {
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado",
        variant: "destructive",
      });
      return false;
    }
    
    const updatedUsers = [...users];
    updatedUsers[userIndex] = {
      ...updatedUsers[userIndex],
      password: newPassword
    };
    
    setUsers(updatedUsers);
    
    toast({
      title: "Senha alterada",
      description: "A senha foi alterada com sucesso",
    });
    
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        login,
        logout,
        isAuthenticated: !!user,
        addUser,
        updateUser,
        deleteUser,
        getUserById,
        getPsychologists,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
