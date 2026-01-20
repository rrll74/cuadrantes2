import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import { clsx } from "clsx";
import { Pagination } from "@/components/ui/Pagination";
import { EstadoPresencia } from "@cuadrantes/shared-dto";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/ui/DataTable";

interface IUnmatchedResult {
  id: number;
  fecha: string;
  fichajeEntrada: string | null;
  fichajeSalida: string | null;
  estado: EstadoPresencia;
  trabajador: {
    nombre: string;
    apellido1: string;
    apellido2?: string;
    puesto?: string;
  } | null;
}

const columnHelper = createColumnHelper<IUnmatchedResult>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columns: ColumnDef<IUnmatchedResult, any>[] = [
  columnHelper.accessor("fecha", {
    header: "Fecha",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
  columnHelper.accessor(
    (row) => {
      const w = row.trabajador;
      return w
        ? `${w.nombre} ${w.apellido1} ${w.apellido2 || ""}`.trim()
        : "Sin asignar";
    },
    {
      id: "trabajador",
      header: "Trabajador",
      cell: (info) => {
        const val = info.getValue();
        return val === "Sin asignar" ? (
          <span className="text-gray-400 italic">{val}</span>
        ) : (
          val
        );
      },
    },
  ),
  columnHelper.accessor(
    (row) => {
      const w = row.trabajador;
      return w ? w.puesto?.trim() : "Sin asignar";
    },
    {
      header: "Puesto",
      cell: (info) => {
        const val = info.getValue();
        return val === "Sin asignar" ? (
          <span className="text-gray-400 italic">{val}</span>
        ) : (
          val
        );
      },
    },
  ),
  columnHelper.accessor("fichajeEntrada", {
    header: "Entrada",
    cell: (info) => {
      const val = info.getValue();
      return val
        ? new Date(val).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";
    },
  }),
  columnHelper.accessor("fichajeSalida", {
    header: "Salida",
    cell: (info) => {
      const val = info.getValue();
      return val
        ? new Date(val).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";
    },
  }),
  columnHelper.accessor("estado", {
    header: "Estado",
    cell: (info) => (
      <span
        className={clsx(
          "px-2 py-1 rounded text-xs font-semibold",
          info.getValue() === EstadoPresencia.COMPLETO
            ? "bg-green-100 text-green-800"
            : info.getValue() === EstadoPresencia.INCOMPLETO
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800",
        )}
      >
        {info.getValue()}
      </span>
    ),
  }),
];

export const UnmatchedResultsTable = ({ sessionId }: { sessionId: number }) => {
  const [data, setData] = useState<IUnmatchedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [stats, setStats] = useState<{
    byStatus: Record<string, number>;
    byPuesto: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await api.get(
          `/jornadas/${sessionId}/unmatched?page=${page}&limit=${limit}&search=${debouncedSearch}&status=${statusFilter}`,
        );
        setData(response.data.data);
        setTotalPages(response.data.meta.totalPages);
        setTotalRecords(response.data.meta.total);
      } catch (error) {
        console.error("Error fetching unmatched results:", error);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchData();
    }
  }, [sessionId, page, debouncedSearch, statusFilter]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get(
          `/jornadas/${sessionId}/unmatched/stats`,
        );
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    if (sessionId) fetchStats();
  }, [sessionId]);

  const handleExport = async () => {
    try {
      const response = await api.get(`/jornadas/${sessionId}/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `jornadas_${sessionId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error exporting:", error);
    }
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-700 mb-2 border-b pb-1">
              Resumen por Estado
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div
                  key={status}
                  className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                >
                  <span className="capitalize text-gray-600">{status}</span>
                  <span className="font-bold text-gray-800">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-700 mb-2 border-b pb-1">
              Top Puestos (Incidencias)
            </h3>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {Object.entries(stats.byPuesto)
                // .slice(0, 5) // Obtiene los cinco con más datos
                .map(([puesto, count]) => (
                  <div key={puesto} className="flex justify-between text-sm">
                    <span
                      className="text-gray-600 truncate pr-2"
                      title={puesto}
                    >
                      {puesto}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex-1 max-w-sm">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar Trabajador
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, apellido, puesto..."
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filtrar Estado
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
          >
            <option value="">Todos</option>
            <option value={EstadoPresencia.COMPLETO}>Completo</option>
            <option value={EstadoPresencia.INCOMPLETO}>Incompleto</option>
            <option value={EstadoPresencia.SIN_PRESENCIA}>Sin Presencia</option>
          </select>
        </div>
        <div className="w-full sm:w-auto flex items-end">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium h-[38px]"
          >
            Exportar Excel
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        emptyMessage="No se encontraron resultados sin ruta."
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setPage}
        isLoading={loading}
      />
    </div>
  );
};
