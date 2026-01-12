"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Toast, ToastType } from "@/components/ui/Toast";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Tooltip } from "@/components/ui/Tooltip";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/components/ui/icons";
import { usePermissions } from "@/hooks/usePermissions";

interface SessionSummary {
  id: number;
  createdAt: string;
  totalRutas: number;
  totalResultados: number;
}

export const SessionsList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
  const canWrite = usePermissions("jornadas:write");
  const isAdmin = usePermissions("admin");
  const canDelete = canWrite || isAdmin;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["jornadas-sessions", user?.userId],
    queryFn: async () => {
      if (!user?.userId) return [];
      const res = await api.get<SessionSummary[]>("/jornadas");
      return res.data;
    },
    enabled: !!user?.userId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/jornadas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jornadas-sessions"] });
    },
  });

  const confirmDelete = async () => {
    if (sessionToDelete === null) return;

    try {
      await deleteMutation.mutateAsync(sessionToDelete);
      setToast({
        message: "Sesión eliminada correctamente.",
        type: "success",
      });
    } catch (error) {
      console.error("Error deleting session:", error);
      setToast({
        message: "Ocurrió un error al eliminar la sesión.",
        type: "error",
      });
    } finally {
      setSessionToDelete(null);
    }
  };

  if (isError)
    return <div className="text-red-500">Error al cargar el historial.</div>;
  if (isLoading || !data)
    return <div className="text-gray-500">Cargando historial...</div>;

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <ConfirmationDialog
        isOpen={sessionToDelete !== null}
        title="Eliminar Sesión"
        message="¿Estás seguro de que deseas eliminar esta sesión? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setSessionToDelete(null)}
        isLoading={deleteMutation.status === "pending"}
      />
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
              <tr
                key={session.id}
                className="hover:bg-gray-50 transition-colors"
              >
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
                  <div className="flex justify-end items-center gap-3">
                    <Tooltip content="Ver resultados">
                      <Link
                        href={`/dashboard/jornadas/${session.id}`}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        aria-label="Ver resultados"
                      >
                        <Icon path={ICONS.EYE} />
                      </Link>
                    </Tooltip>
                    {canDelete && (
                      <Tooltip content="Eliminar sesión">
                        <button
                          onClick={() => setSessionToDelete(session.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          aria-label="Eliminar sesión"
                        >
                          <Icon path={ICONS.TRASH} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
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
    </>
  );
};
