"use client";

import React from "react";
import {
  useServiceSummary,
  ServiceSummaryRow,
} from "@/hooks/useServiceSummary";
import { SummaryTable, SummaryTableColumn } from "./SummaryTable";
import { MinimumJourneysTable } from "./MinimumJourneysTable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ServiceSummaryTableProps {
  sessionId: number;
}

export const ServiceSummaryTable = ({
  sessionId,
}: ServiceSummaryTableProps) => {
  const { data, isLoading, error, handleExport } = useServiceSummary(sessionId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <span>Cargando resumen por servicios...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
        Error al cargar los datos del resumen por servicios.
      </div>
    );
  }

  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        No hay datos disponibles para generar el resumen.
      </div>
    );
  }

  const { rows, total, discountedRows, discountedTotal } = data;

  const columns: SummaryTableColumn<ServiceSummaryRow>[] = [
    {
      header: "Servicio",
      render: (row) => row.servicio,
      align: "left",
    },
    {
      header: "Jornadas (Horas / 7)",
      render: (row) => (
        <span className="font-mono">{row.jornadas.toFixed(2)}</span>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="w-full h-96 bg-white p-4 rounded-lg shadow-sm border border-gray-200 max-w-3xl mx-auto">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">
          Comparativa de Jornadas por Servicio
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis
              dataKey="servicio"
              type="category"
              width={150}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number | undefined) => [
                value ? value.toFixed(2) : "0.00",
                "Jornadas",
              ]}
            />
            <Legend />
            <Bar dataKey="jornadas" fill="#82ca9d" name="Jornadas" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <SummaryTable
        title="Resumen de Jornadas por Servicio"
        columns={columns}
        data={rows}
        className="max-w-3xl"
        headerActions={
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Total Jornadas: {total.toFixed(2)}
            </span>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Exportar Excel
            </button>
          </div>
        }
        footer={
          <tr>
            <td className="px-6 py-4 text-gray-900 uppercase">TOTAL</td>
            <td className="px-6 py-4 text-right text-gray-900 font-mono text-base">
              {total.toFixed(2)}
            </td>
          </tr>
        }
      />

      {discountedRows && discountedRows.length > 0 && (
        <SummaryTable
          title="Servicios Descontados (No computan)"
          columns={columns}
          data={discountedRows}
          variant="discounted"
          className="max-w-3xl"
          headerActions={
            <div className="flex items-center gap-4">
              <span className="text-sm text-red-600">
                Total Descontado: {discountedTotal?.toFixed(2)}
              </span>
            </div>
          }
          footer={
            <tr>
              <td className="px-6 py-4 text-gray-900 uppercase">
                TOTAL DESCONTADO
              </td>
              <td className="px-6 py-4 text-right text-gray-900 font-mono text-base">
                {discountedTotal?.toFixed(2)}
              </td>
            </tr>
          }
        />
      )}

      {data.session && (
        <MinimumJourneysTable
          session={data.session}
          totalRealized={total}
          className="max-w-3xl"
        />
      )}
    </div>
  );
};
