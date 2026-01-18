"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieLabelRenderProps,
} from "recharts";

interface EqualPuestoSummaryRow {
  puesto: string;
  equal: number;
  jornadas: number;
}

interface EqualPuestoSummaryResponse {
  rows: EqualPuestoSummaryRow[];
  total: number;
}

interface EqualAndPuestosSummaryTableProps {
  sessionId: number;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
];

export const EqualAndPuestosSummaryTable = ({
  sessionId,
}: EqualAndPuestosSummaryTableProps) => {
  const { data, isLoading, error } = useQuery<EqualPuestoSummaryResponse>({
    queryKey: ["jornadas-equal-puesto-summary", sessionId],
    queryFn: async () => {
      const response = await api.get(
        `/jornadas/${sessionId}/equal-puesto-summary`,
      );
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <span>Cargando resumen por Puesto y Equal...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
        Error al cargar los datos del resumen.
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

  const { rows, total } = data;

  const chartData = rows.map((row) => ({
    name: `${row.puesto} (Eq: ${row.equal})`,
    value: row.jornadas,
  }));

  return (
    <div className="space-y-8">
      {/* Gráfico Circular */}
      <div className="w-full h-96 bg-white p-4 rounded-lg shadow-sm border border-gray-200 max-w-4xl mx-auto">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">
          Distribución de Jornadas
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ percent }: PieLabelRenderProps) =>
                `${((percent || 0) * 100).toFixed(0)}%`
              }
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | undefined) => [
                value ? value.toFixed(2) : "0.00",
                "Jornadas",
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full overflow-hidden border border-gray-200 rounded-lg shadow-sm bg-white max-w-4xl mx-auto">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-700">
            Resumen de Jornadas por Puesto y Equal
          </h3>
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
        </div>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                Puesto
              </th>
              <th className="px-6 py-3 text-center font-semibold text-gray-600 uppercase tracking-wider">
                Equal
              </th>
              <th className="px-6 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                Jornadas (Horas / 7)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-blue-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {row.puesto}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">
                  {row.equal}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700 font-mono">
                  {row.jornadas.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-200">
            <tr>
              <td className="px-6 py-4 text-gray-900 uppercase" colSpan={2}>
                TOTAL
              </td>
              <td className="px-6 py-4 text-right text-gray-900 font-mono text-base">
                {total.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
