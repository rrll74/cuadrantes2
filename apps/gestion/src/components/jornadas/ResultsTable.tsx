import React, { useState } from "react";
import { getFilteredRowModel, ColumnFiltersState } from "@tanstack/react-table";
import { EstadoPresencia } from "@cuadrantes/shared-dto";
import { SummaryCards } from "./SummaryCards";
import { Pagination } from "@/components/ui/Pagination";
import { useResultsTable } from "@/hooks/useResultsTable";
import { columns } from "./results-table-columns";
import { DataTable } from "@/components/ui/DataTable";

export const ResultsTable = ({ sessionId }: { sessionId: number }) => {
  const {
    data,
    loading,
    page,
    setPage,
    totalPages,
    totalRecords,
    stats,
    globalFilter,
    setGlobalFilter,
    statusFilter,
    setStatusFilter,
    discountedFilter,
    setDiscountedFilter,
    handleExport,
  } = useResultsTable(sessionId);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

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
          <div className="w-full sm:w-40">
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
          <div className="w-full sm:w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo Jornada
            </label>
            <select
              value={discountedFilter}
              onChange={(e) => setDiscountedFilter(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
            >
              <option value="">Todas</option>
              <option value="false">Computables</option>
              <option value="true">Descontadas</option>
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

      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        emptyMessage="No se encontraron resultados."
        options={{
          state: {
            globalFilter,
            columnFilters,
          },
          manualFiltering: true,
          onGlobalFilterChange: setGlobalFilter,
          onColumnFiltersChange: setColumnFilters,
          getFilteredRowModel: getFilteredRowModel(),
        }}
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
