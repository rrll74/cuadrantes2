"use client";

import React, { useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
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

interface StatusPartsSummaryRow {
  estado: string;
  noPartsCount: number;
  noPartsPercent: number;
  withPartsCount: number;
  withPartsPercent: number;
}

interface StatusPartsSummaryResponse {
  rows: StatusPartsSummaryRow[];
  footer: StatusPartsSummaryRow;
}

interface StatusPartsSummaryTableProps {
  sessionId: number;
}

export const StatusPartsSummaryTable = ({
  sessionId,
}: StatusPartsSummaryTableProps) => {
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
            downloadLink.download = `grafico-estado-partes-${sessionId}.png`;
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

  const { data, isLoading, error } = useQuery<StatusPartsSummaryResponse>({
    queryKey: ["jornadas-status-parts-summary", sessionId],
    queryFn: async () => {
      const response = await api.get(
        `/jornadas/${sessionId}/status-parts-summary`,
      );
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <span>Cargando resumen por estado y partes...</span>
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

  const { rows, footer } = data;

  return (
    <div className="space-y-8">
      <div className="w-full h-96 bg-white p-4 rounded-lg shadow-sm border border-gray-200 max-w-5xl mx-auto flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">
            Distribución de Estados por Presencia de Partes
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
            <BarChart
              data={rows}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="estado"
                tickFormatter={(val) =>
                  String(val).charAt(0).toUpperCase() + String(val).slice(1)
                }
              />
              <YAxis />
              <Tooltip />
              <Legend />
              {/* Colores alineados con la tabla: Rojo/Naranja para Sin Partes, Verde para Con Partes */}
              <Bar
                dataKey="noPartsCount"
                stackId="a"
                fill="#ff8042"
                name="Sin Partes"
              />
              <Bar
                dataKey="withPartsCount"
                stackId="a"
                fill="#82ca9d"
                name="Con Partes"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="w-full overflow-hidden border border-gray-200 rounded-lg shadow-sm bg-white max-w-5xl mx-auto">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-700">
            Resumen de Fichajes por Estado y Partes
          </h3>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Exportar Excel
          </button>
        </div>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th
                rowSpan={2}
                className="px-6 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200"
              >
                Estado
              </th>
              <th
                colSpan={2}
                className="px-6 py-3 text-center font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 bg-red-50"
              >
                Sin Partes
              </th>
              <th
                colSpan={2}
                className="px-6 py-3 text-center font-semibold text-gray-600 uppercase tracking-wider bg-green-50"
              >
                Con Partes
              </th>
            </tr>
            <tr>
              <th className="px-4 py-2 text-right font-medium text-gray-500 border-r border-gray-200 bg-red-50">
                Cantidad
              </th>
              <th className="px-4 py-2 text-right font-medium text-gray-500 border-r border-gray-200 bg-red-50">
                %
              </th>
              <th className="px-4 py-2 text-right font-medium text-gray-500 border-r border-gray-200 bg-green-50">
                Cantidad
              </th>
              <th className="px-4 py-2 text-right font-medium text-gray-500 bg-green-50">
                %
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-blue-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 border-r border-gray-200 capitalize">
                  {row.estado}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700 border-r border-gray-200">
                  {row.noPartsCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500 border-r border-gray-200">
                  {row.noPartsPercent.toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700 border-r border-gray-200">
                  {row.withPartsCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500">
                  {row.withPartsPercent.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-200">
            <tr>
              <td className="px-6 py-4 text-gray-900 uppercase border-r border-gray-200">
                TOTAL
              </td>
              <td className="px-6 py-4 text-right text-gray-900 border-r border-gray-200">
                {footer.noPartsCount}
              </td>
              <td className="px-6 py-4 text-right text-gray-900 border-r border-gray-200">
                {footer.noPartsPercent.toFixed(2)}%
              </td>
              <td className="px-6 py-4 text-right text-gray-900 border-r border-gray-200">
                {footer.withPartsCount}
              </td>
              <td className="px-6 py-4 text-right text-gray-900">
                {footer.withPartsPercent.toFixed(2)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
