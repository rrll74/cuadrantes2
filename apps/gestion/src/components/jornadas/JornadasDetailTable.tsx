"use client";

import React from "react";
import { JornadasEvolutionChart } from "./JornadasEvolutionChart";
import { DetailTable } from "./DetailTable";
import { useJornadasDetail } from "@/hooks/useJornadasDetail";

interface JornadasDetailTableProps {
  sessionId: number;
}

export const JornadasDetailTable = ({
  sessionId,
}: JornadasDetailTableProps) => {
  const { data, isLoading, error, handleExport } = useJornadasDetail(sessionId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <span>Cargando tabla detallada...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
        Error al cargar los datos de la tabla detallada.
      </div>
    );
  }

  if (!data || !data.columns || data.columns.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        No hay datos disponibles para generar la tabla detallada.
      </div>
    );
  }

  const { columns, rows, footer, discountedRows, discountedFooter } = data;

  // Preparar datos para el gráfico (evolución de totales por día)
  const chartData = columns.map((col) => ({
    date: col.label,
    total: Number(footer[`${col.key}_value`] || 0),
  }));

  return (
    <div className="space-y-8">
      <JornadasEvolutionChart data={chartData} sessionId={sessionId} />

      <DetailTable
        columns={columns}
        rows={rows}
        footer={footer}
        title="Tabla Detallada por Equipos"
        onExport={handleExport}
      />

      {discountedRows && discountedRows.length > 0 && discountedFooter && (
        <DetailTable
          columns={columns}
          rows={discountedRows}
          footer={discountedFooter}
          title="Equipos Descontados (No computan)"
          isDiscounted={true}
        />
      )}
    </div>
  );
};
