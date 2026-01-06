"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";

interface SessionSummary {
  id: number;
  createdAt: string;
  totalRutas: number;
  totalResultados: number;
}

export const SessionsList = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["jornadas-sessions"],
    queryFn: async () => {
      const res = await axios.get<SessionSummary[]>("/api/jornadas");
      return res.data;
    },
  });

  if (isLoading)
    return <div className="text-gray-500">Cargando historial...</div>;
  if (isError)
    return <div className="text-red-500">Error al cargar el historial.</div>;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden border">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900">
          Historial de Cargas
        </h3>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rutas
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Procesados
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data?.map((session) => (
            <tr key={session.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                #{session.id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(session.createdAt).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {session.totalRutas}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {session.totalResultados}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  href={`/dashboard/jornadas/${session.id}`}
                  className="text-blue-600 hover:text-blue-900 font-semibold"
                >
                  Ver Resultados
                </Link>
              </td>
            </tr>
          ))}
          {data?.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-6 py-4 text-center text-sm text-gray-500"
              >
                No hay sesiones registradas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
