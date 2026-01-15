import React, { useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  ColumnFiltersState,
} from "@tanstack/react-table";
import api from "@/lib/api";
import { clsx } from "clsx";
import { IResultadoPresencia, EstadoPresencia } from "@cuadrantes/shared-dto";
import { SummaryCards } from "./SummaryCards";
import { Pagination } from "@/components/ui/Pagination";
import { useDebounce } from "@/hooks/useDebounce";

const columnHelper = createColumnHelper<IResultadoPresencia>();

const columns = [
  columnHelper.accessor("ruta.fechaGeneral", {
    header: "Fecha",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
  columnHelper.accessor("ruta.servicio", {
    header: "Servicio",
  }),
  columnHelper.accessor("ruta.equipo", {
    header: "Equipo",
  }),
  // Modificamos el accessor para que devuelva un string buscable
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
  columnHelper.accessor("ruta.inicio", {
    header: "Inicio Plan.",
    cell: (info) =>
      new Date(info.getValue()).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
  }),
  columnHelper.accessor("ruta.fin", {
    header: "Fin Plan.",
    cell: (info) =>
      new Date(info.getValue()).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
  }),
  columnHelper.accessor("fichajeEntrada", {
    header: "Entrada Real",
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
    header: "Salida Real",
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

export const ResultsTable = ({ sessionId }: { sessionId: number }) => {
  const [data, setData] = useState<IResultadoPresencia[]>([]);
  const [loading, setLoading] = useState(true);
  // Estado de paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  const limit = 10; // Registros por página

  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const debouncedFilter = useDebounce(globalFilter, 500);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    setPage(1);
  }, [debouncedFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Llamada al endpoint paginado
        const response = await api.get(
          `/jornadas/${sessionId}?page=${page}&limit=${limit}&search=${debouncedFilter}&status=${statusFilter}`,
        );

        // La respuesta ahora tiene la estructura { data, meta, stats }
        setData(response.data.data);
        setTotalPages(response.data.meta.totalPages);
        setTotalRecords(response.data.meta.total);
        setStats(response.data.stats);
      } catch (error) {
        console.error("Error fetching results:", error);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchData();
    }
  }, [sessionId, page, debouncedFilter, statusFilter]); // Recargar cuando cambie la página o el filtro

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

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      columnFilters,
    },
    manualFiltering: true, // Importante: Desactivar filtrado cliente para usar backend
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading && data.length === 0)
    return (
      <div className="p-4 text-center text-gray-500">
        Cargando resultados...
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Tarjetas de Resumen */}
      {stats && <SummaryCards stats={stats} />}

      {/* Controles de Filtro */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex-1 max-w-sm">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar Trabajador
          </label>
          <input
            type="text"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Nombre, apellido, equipo..."
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
          />
        </div>
        <div className="w-full sm:w-auto flex gap-4 items-end">
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
              <option value={EstadoPresencia.SIN_PRESENCIA}>
                Sin Presencia
              </option>
            </select>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium h-[38px]"
          >
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-sm relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-4 text-center text-gray-500 text-sm"
                >
                  No se encontraron resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
