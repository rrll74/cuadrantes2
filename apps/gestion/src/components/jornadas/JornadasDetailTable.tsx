"use client";

import React, { useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TableColumn {
  key: string;
  label: string;
}

interface TableRow {
  servicio: string;
  equipo: string;
  total_value: number;
  total_color?: "green" | "yellow" | "red";
  [key: string]: string | number | ("green" | "yellow" | "red") | undefined;
}

interface TableDetailResponse {
  columns: TableColumn[];
  rows: TableRow[];
  footer: TableRow;
}

interface JornadasDetailTableProps {
  sessionId: number;
}

/**
 * Mapea colores a clases de Tailwind
 */
const getColorClasses = (
  color?: "green" | "yellow" | "red",
): { bg: string; text: string } => {
  switch (color) {
    case "green":
      return { bg: "bg-green-50", text: "text-green-900" };
    case "yellow":
      return { bg: "bg-yellow-50", text: "text-yellow-900" };
    case "red":
      return { bg: "bg-red-50", text: "text-red-900" };
    default:
      return { bg: "bg-white", text: "text-gray-700" };
  }
};

export const JornadasDetailTable = ({
  sessionId,
}: JornadasDetailTableProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(() => {
    if (chartRef.current) {
      const svg = chartRef.current.querySelector("svg");
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        const svgSize = svg.getBoundingClientRect();
        canvas.width = svgSize.width;
        canvas.height = svgSize.height;

        img.onload = () => {
          if (ctx) {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL("image/png");

            const downloadLink = document.createElement("a");
            downloadLink.download = `grafico-evolucion-${sessionId}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
          }
        };

        img.src =
          "data:image/svg+xml;base64," +
          btoa(unescape(encodeURIComponent(svgData)));
      }
    }
  }, [sessionId]);

  const { data, isLoading, error } = useQuery<TableDetailResponse>({
    queryKey: ["jornadas-detail", sessionId],
    queryFn: async () => {
      const response = await api.get(`/jornadas/${sessionId}/table-detail`);
      return response.data;
    },
  });

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

  const { columns, rows, footer } = data;

  // Preparar datos para el gráfico (evolución de totales por día)
  const chartData = columns.map((col) => ({
    date: col.label,
    total: Number(footer[`${col.key}_value`] || 0),
  }));

  return (
    <div className="space-y-8">
      <div className="w-full h-96 bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">
            Evolución de Jornadas por Día
          </h3>
          <button
            onClick={handleDownload}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            Descargar PNG
          </button>
        </div>
        <div className="flex-1 min-h-0" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                name="Total Jornadas"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="w-full overflow-hidden border border-gray-200 rounded-lg shadow-sm bg-white">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-700">
            Tabla Detallada por Equipos
          </h3>
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-4 text-xs mr-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-200 rounded"></div>
                <span className="text-gray-600">Completo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-200 rounded"></div>
                <span className="text-gray-600">Incompleto</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-200 rounded"></div>
                <span className="text-gray-600">Sin Presencia</span>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Exportar Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[75vh]">
          <table className="min-w-full divide-y divide-gray-200 text-sm border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider border-b border-r bg-gray-50 sticky left-0 z-30 w-40 min-w-[10rem]">
                  Servicio
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider border-b border-r bg-gray-50 sticky left-40 z-30 w-32 min-w-[8rem]">
                  Equipo
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-2 py-3 text-center font-medium text-gray-500 border-b min-w-[60px]"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase tracking-wider border-b border-l bg-gray-100 min-w-[80px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((row, idx) => (
                <tr
                  key={`${row.servicio}-${row.equipo}-${idx}`}
                  className="hover:bg-blue-50 transition-colors"
                >
                  <td
                    className="px-4 py-2 whitespace-nowrap font-medium text-gray-900 border-r bg-white sticky left-0 z-10 w-40 truncate"
                    title={row.servicio}
                  >
                    {row.servicio}
                  </td>
                  <td
                    className="px-4 py-2 whitespace-nowrap text-gray-600 border-r bg-white sticky left-40 z-10 w-32 truncate"
                    title={row.equipo}
                  >
                    {row.equipo}
                  </td>
                  {columns.map((col) => {
                    const colorClass = getColorClasses(
                      row[`${col.key}_color`] as
                        | "green"
                        | "yellow"
                        | "red"
                        | undefined,
                    );
                    return (
                      <td
                        key={col.key}
                        className={`px-2 py-2 text-center font-medium ${colorClass.bg} ${colorClass.text}`}
                      >
                        {row[`${col.key}_value`] !== undefined
                          ? row[`${col.key}_value`]
                          : "-"}
                      </td>
                    );
                  })}
                  <td
                    className={`px-4 py-2 text-center font-bold border-l ${getColorClasses(row.total_color).bg} ${getColorClasses(row.total_color).text}`}
                  >
                    {row.total_value}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold sticky bottom-0 z-20 shadow-inner">
              <tr>
                <td
                  className="px-4 py-3 text-right text-gray-800 border-t border-r bg-gray-100 sticky left-0 z-30"
                  colSpan={2}
                >
                  TOTALES
                </td>
                {columns.map((col) => {
                  const colorClass = getColorClasses(
                    footer[`${col.key}_color`] as
                      | "green"
                      | "yellow"
                      | "red"
                      | undefined,
                  );
                  return (
                    <td
                      key={col.key}
                      className={`px-2 py-3 text-center text-gray-900 border-t font-bold ${colorClass.bg} ${colorClass.text}`}
                    >
                      {footer[`${col.key}_value`] !== undefined
                        ? footer[`${col.key}_value`]
                        : "-"}
                    </td>
                  );
                })}
                <td
                  className={`px-4 py-3 text-center text-gray-900 border-t border-l font-bold ${getColorClasses(footer.total_color).bg} ${getColorClasses(footer.total_color).text}`}
                >
                  {footer.total_value}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
