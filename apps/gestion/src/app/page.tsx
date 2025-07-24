"use client"; // Necesario para usar hooks como useQuery

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ApiStatusResponse, HealthStatus } from "@cuadrantes/shared-dto";

// --- Función que obtiene el estado de la API ---
const getApiStatus = async (): Promise<ApiStatusResponse> => {
  const { data } = await api.get<ApiStatusResponse>("/");
  return data;
};

export default function HomePage() {
  // Usamos el hook useQuery para obtener el estado de la API
  const {
    data,
    isLoading: isLoadingApiStatus,
    isError,
    error,
  } = useQuery({
    queryKey: ["apiStatus"], // Nueva clave única para esta consulta
    queryFn: getApiStatus, // Nueva función que se ejecutará
    retry: false, // Evitamos reintentos en la página principal para mostrar el error rápido
  });

  const { isAuthenticated, isLoading } = useAuth();

  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace("/dashboard");
    } else {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-2xl items-center justify-center font-sans text-center">
        <h1 className="text-4xl font-bold mb-8 text-gray-800 dark:text-gray-200">
          Aplicación de Gestión
        </h1>
        <Paper elevation={3} className="p-6 bg-white dark:bg-gray-800">
          <Typography
            variant="h6"
            className="mb-4 text-gray-700 dark:text-gray-300"
          >
            Estado del Servidor
          </Typography>
          {isLoadingApiStatus && <CircularProgress size={24} />}
          {isError && (
            <p className="text-red-500">
              Error al conectar con la API: {error.message}
            </p>
          )}
          {data && (
            <div className="space-y-4 text-left">
              <p className="text-lg font-semibold text-center text-gray-700 dark:text-gray-300 mb-4">
                {data.welcomeMessage}
              </p>
              <div className="border-t pt-4 space-y-2">
                <StatusIndicator
                  name="Base de Datos Principal (new)"
                  status={data.databaseStatus.new}
                />
                <StatusIndicator
                  name="Base de Datos Antigua (old)"
                  status={data.databaseStatus.old}
                />
              </div>
            </div>
          )}
        </Paper>
      </div>
      <footer className="mt-8">
        <Button href="/login" variant="contained" color="primary">
          Login
        </Button>
      </footer>
    </main>
  );
}

// --- Componente auxiliar para mostrar el estado ---
const StatusIndicator = ({
  name,
  status,
}: {
  name: string;
  status: HealthStatus;
}) => (
  <div className="flex items-center justify-between py-1">
    <span className="font-medium text-gray-600 dark:text-gray-400">
      {name}:
    </span>
    {status.status === "ok" ? (
      <span className="font-bold text-green-600">✅ Conectado</span>
    ) : (
      <div className="text-right">
        <span className="font-bold text-red-500">❌ Error</span>
        {status.message && (
          <p
            className="text-xs text-red-400 mt-1 max-w-xs truncate"
            title={status.message}
          >
            {status.message}
          </p>
        )}
      </div>
    )}
  </div>
);
