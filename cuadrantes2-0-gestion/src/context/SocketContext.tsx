"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

// 1. Crear el contexto
const SocketContext = createContext<Socket | null>(null);

// 2. Crear un hook personalizado para usar el contexto fácilmente
export const useSocket = () => {
  return useContext(SocketContext);
};

// 3. Crear el Proveedor del Contexto
export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (token) {
      const socketURL =
        `${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}` ||
        "http://localhost:3001";

      const newSocket = io(socketURL, {
        withCredentials: true,
        auth: {
          token: token,
        },
      });

      setSocket(newSocket);

      // Limpieza al desmontar el proveedor (ej. al cerrar sesión)
      return () => {
        newSocket.disconnect();
      };
    }
  }, [token]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
