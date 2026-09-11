import * as XLSX from "xlsx";
import type { DistributionResult } from "./types";

const formatDateStamp = (date: Date) =>
  date.toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);

export const exportDistributionToExcel = (
  result: DistributionResult,
  fileName = `distribucion_presupuesto_${formatDateStamp(new Date())}.xlsx`,
) => {
  const rows = [
    ["Distribución automática de presupuesto"],
    [],
    ["Presupuesto objetivo", result.summary.presupuestoObjetivo],
    ["Subtotal calculado", result.summary.subtotalCalculado],
    ["Diferencia", result.summary.diferencia],
    ["Ajuste final aplicado", result.summary.ajusteFinalAplicado ? "Sí" : "No"],
    [],
    ["Código", "Descripción", "Precio unitario", "Unidades", "Subtotal"],
    ...result.rows.map((row) => [
      row.codigo || "-",
      row.descripcion,
      row.precioUnitario,
      row.unidades,
      row.subtotal,
    ]),
    ["TOTAL", "", "", "", result.summary.subtotalCalculado],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 16 },
    { wch: 40 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Distribucion");
  XLSX.writeFile(workbook, fileName, { compression: true });
};
