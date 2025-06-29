"use client"; // Necesario para usar hooks como useQuery

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import Button from "@mui/material/Button";

// Función que obtendrá los datos de la API
const getHelloMessage = async (): Promise<string> => {
  const { data } = await api.get("/");
  return data;
};

export default function Home() {
  // Usamos el hook useQuery para llamar a la API
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["helloMessage"], // Clave única para esta consulta
    queryFn: getHelloMessage, // Función que se ejecutará
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm text-center">
        <h1 className="text-4xl font-bold mb-8">Aplicación de Gestión</h1>
        <div className="p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <p className="text-lg">Mensaje desde la API:</p>
          {isLoading && <p className="text-blue-500">Cargando...</p>}
          {isError && <p className="text-red-500">Error: {error.message}</p>}
          {data && (
            <p className="text-2xl font-semibold text-green-600 mt-2">
              &quot;{data}&quot;
            </p>
          )}
        </div>
      </div>
      <footer className="flex items-center justify-center w-full h-24 border-t">
        <Button href="/login" variant="contained" color="primary">
          Login
        </Button>
      </footer>
    </main>
  );
}
