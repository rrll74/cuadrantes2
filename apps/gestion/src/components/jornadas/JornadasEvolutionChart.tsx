import React, { useRef, useCallback } from "react";
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

interface ChartData {
  date: string;
  total: number;
}

interface JornadasEvolutionChartProps {
  data: ChartData[];
  sessionId: number;
}

export const JornadasEvolutionChart = ({
  data,
  sessionId,
}: JornadasEvolutionChartProps) => {
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

  return (
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
            data={data}
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
  );
};
