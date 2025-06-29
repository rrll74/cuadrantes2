"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import api from "@/lib/api";

// Define la forma del usuario decodificado del token
interface AuthUser {
  userId: number;
  username: string;
  permisos: string[];
}

// Define lo que el contexto proveerá
interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Al cargar la app, intenta leer el token de las cookies
    const token = Cookies.get("token");
    if (token) {
      try {
        const decodedUser: AuthUser = jwtDecode(token);
        setUser(decodedUser);
        // Configura axios para que siempre envíe el token
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } catch (error) {
        console.error("Token inválido", error);
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string) => {
    const decodedUser: AuthUser = jwtDecode(token);
    setUser(decodedUser);
    // Almacena el token en una cookie segura
    Cookies.set("token", token, {
      expires: 1,
      secure: process.env.NODE_ENV === "production",
    });
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  };

  const logout = () => {
    setUser(null);
    Cookies.remove("token");
    delete api.defaults.headers.common["Authorization"];
  };

  const value = {
    isAuthenticated: !!user,
    user,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personalizado para usar el contexto fácilmente
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};
