"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
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
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Función de ayuda para decodificar el token y obtener su fecha de expiración en milisegundos
const getTokenExpiration = (token: string): number | null => {
  try {
    const decoded: { exp: number } = jwtDecode(token);
    return decoded.exp * 1000; // exp está en segundos, lo convertimos a ms
  } catch (e) {
    console.error("Error decodificando el token", e);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Envolvemos logout en useCallback para que su referencia sea estable
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    Cookies.remove("token");
    delete api.defaults.headers.common["Authorization"];
  }, []);

  // Envolvemos login en useCallback para que su referencia sea estable
  const login = useCallback(
    (newToken: string) => {
      try {
        const decodedUser: AuthUser = jwtDecode(newToken);
        const expirationTime = getTokenExpiration(newToken);

        // Si el token es inválido o ya expiró, cerramos sesión
        if (!expirationTime || expirationTime <= Date.now()) {
          logout();
          return;
        }

        setUser(decodedUser);
        setToken(newToken);

        // Almacena el token en una cookie segura, haciendo que la cookie expire cuando el token lo haga.
        const expires = new Date(expirationTime);
        Cookies.set("token", newToken, {
          expires,
          secure: process.env.NODE_ENV === "production",
        });
        api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      } catch (error) {
        console.error("Token inválido al intentar iniciar sesión", error);
        logout();
      }
    },
    [logout]
  );

  // Efecto para cargar el token de la cookie en el primer renderizado
  useEffect(() => {
    const cookieToken = Cookies.get("token");
    if (cookieToken) {
      // Usamos la función login para validar y establecer el estado
      login(cookieToken);
    }
    setIsLoading(false);
  }, [login]);

  // Efecto para la renovación automática del token (sesión deslizante)
  useEffect(() => {
    if (!token) {
      return;
    }

    const refreshToken = async () => {
      try {
        console.log("Intentando renovar la sesión...");
        const { data } = await api.post("/auth/refresh");
        login(data.access_token); // Usamos login para actualizar todo el estado
        console.log("Sesión renovada exitosamente.");
      } catch (error) {
        console.error(
          "No se pudo renovar la sesión. Se cerrará la sesión.",
          error
        );
        logout();
      }
    };

    // Comprobamos cada minuto si el token está a punto de expirar
    const intervalId = setInterval(() => {
      const expirationTime = getTokenExpiration(token);
      if (!expirationTime) return logout();

      const timeRemaining = expirationTime - Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (timeRemaining < fiveMinutes) {
        refreshToken();
      }
    }, 60 * 1000); // 60 segundos

    return () => clearInterval(intervalId); // Limpiamos el intervalo al desmontar
  }, [token, login, logout]);

  const value = {
    isAuthenticated: !!user,
    user,
    token,
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
