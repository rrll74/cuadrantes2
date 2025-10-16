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
import { useQueryClient } from "@tanstack/react-query";

// 1. Crear el contexto
const SocketContext = createContext<Socket | null>(null);

// 2. Crear un hook personalizado para usar el contexto fácilmente
export const useSocket = () => {
  return useContext(SocketContext);
};

// 3. Crear el Proveedor del Contexto
export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token, logout } = useAuth(); // Obtenemos la función logout del contexto de autenticación
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (token) {
      const socketURL =
        `${process.env.NEXT_PUBLIC_API_URL}` || "http://localhost:3001";

      const newSocket = io(socketURL, {
        withCredentials: true,
        auth: {
          token: token,
        },
      });

      setSocket(newSocket);

      // Escuchamos el evento de desconexión
      newSocket.on("disconnect", (reason) => {
        console.log(`Socket desconectado. Razón: ${reason}`);
        // 'io server disconnect' es la razón por defecto cuando el servidor
        // fuerza la desconexión con socket.disconnect(true).
        if (reason === "io server disconnect") {
          console.log("Desconexión forzada por el servidor. Cerrando sesión.");
          // Llamamos a la función de logout para limpiar el token y el estado local.
          logout();
        }
      });

      // Escuchamos el evento de cambio de estado del bloqueo de sesión
      newSocket.on(
        "auth:lockdown_status_changed",
        (status: { isLocked: boolean }) => {
          console.log(
            "Estado de bloqueo actualizado desde el servidor:",
            status,
          );
          // Actualizamos el caché de react-query directamente.
          // Esto hará que cualquier componente que use useQuery(['lockdownStatus']) se actualice.
          queryClient.setQueryData(["lockdownStatus"], status);
        },
      );

      // Limpieza al desmontar el proveedor (ej. al cerrar sesión)
      return () => {
        newSocket.off("disconnect");
        newSocket.off("auth:lockdown_status_changed");
        newSocket.disconnect();
      };
    }
  }, [token, logout, queryClient]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
