"use client";

import React from "react";
import {
  useEqualPuestoSummary,
  EqualPuestoSummaryRow,
} from "@/hooks/useEqualPuestoSummary";
import { SummaryTable, SummaryTableColumn } from "./SummaryTable";
import { MinimumJourneysTable } from "./MinimumJourneysTable";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieLabelRenderProps,
} from "recharts";

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
  const { data, isLoading, error, handleExport } =
    useEqualPuestoSummary(sessionId);

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

  const { rows, total, discountedRows, discountedTotal } = data;

  const chartData = rows.map((row) => ({
    name: `${row.puesto} (Eq: ${row.equal})`,
    value: row.jornadas,
  }));

  const columns: SummaryTableColumn<EqualPuestoSummaryRow>[] = [
    {
      header: "Puesto",
      render: (row) => row.puesto,
      align: "left",
    },
    {
      header: "Equal",
      render: (row) => row.equal,
      align: "center",
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

      <SummaryTable
        title="Resumen de Jornadas por Puesto y Equal"
        columns={columns}
        data={rows}
        className="max-w-4xl"
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
            <td className="px-6 py-4 text-gray-900 uppercase" colSpan={2}>
              TOTAL
            </td>
            <td className="px-6 py-4 text-right text-gray-900 font-mono text-base">
              {total.toFixed(2)}
            </td>
          </tr>
        }
      />

      {discountedRows && discountedRows.length > 0 && (
        <SummaryTable
          title="Puestos Descontados (No computan)"
          columns={columns}
          data={discountedRows}
          variant="discounted"
          className="max-w-4xl"
          headerActions={
            <div className="flex items-center gap-4">
              <span className="text-sm text-red-600">
                Total Descontado: {discountedTotal?.toFixed(2)}
              </span>
            </div>
          }
          footer={
            <tr>
              <td className="px-6 py-4 text-gray-900 uppercase" colSpan={2}>
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
          className="max-w-4xl"
        />
      )}
    </div>
  );
};
