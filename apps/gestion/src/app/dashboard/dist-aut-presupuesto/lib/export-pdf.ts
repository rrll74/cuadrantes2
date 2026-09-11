import jsPDF from "jspdf";
import type { DistributionResult } from "./types";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const formatDateStamp = (date: Date) =>
  date.toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);

export const exportDistributionToPdf = (
  result: DistributionResult,
  fileName = `distribucion_presupuesto_${formatDateStamp(new Date())}.pdf`,
) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = 210 - marginLeft - marginRight;
  const rowPadding = 2;
  const topY = 16;
  const columnWidths = [18, 78, 28, 22, 28];
  const columnX = [marginLeft];

  for (let index = 0; index < columnWidths.length - 1; index += 1) {
    columnX.push(columnX[index] + columnWidths[index]);
  }

  const drawHeader = (y: number) => {
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Distribución automática de presupuesto", marginLeft, y);

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const metadataLines = [
      `Presupuesto objetivo: ${formatMoney(result.summary.presupuestoObjetivo)}`,
      `Subtotal calculado: ${formatMoney(result.summary.subtotalCalculado)}`,
      `Diferencia: ${formatMoney(result.summary.diferencia)}`,
      `Ajuste final aplicado: ${result.summary.ajusteFinalAplicado ? "Sí" : "No"}`,
    ];

    metadataLines.forEach((line, index) => {
      pdf.text(line, marginLeft, y + 7 + index * 5);
    });

    const tableStartY = y + 30;
    pdf.setFont("helvetica", "bold");
    pdf.setDrawColor(210);
    pdf.setFillColor(245, 245, 245);
    pdf.rect(marginLeft, tableStartY - 5, contentWidth, 8, "FD");
    pdf.text("Código", columnX[0] + 1, tableStartY);
    pdf.text("Descripción", columnX[1] + 1, tableStartY);
    pdf.text("Precio", columnX[2] + 1, tableStartY);
    pdf.text("Unidades", columnX[3] + 1, tableStartY);
    pdf.text("Subtotal", columnX[4] + 1, tableStartY);

    return tableStartY + 5;
  };

  const ensureSpace = (currentY: number, requiredHeight: number) => {
    if (currentY + requiredHeight <= 285) {
      return currentY;
    }

    pdf.addPage();
    return drawHeader(topY);
  };

  let currentY = drawHeader(topY);

  result.rows.forEach((row) => {
    const descriptionLines = pdf.splitTextToSize(
      row.descripcion,
      columnWidths[1] - 2,
    );
    const rowHeight = Math.max(descriptionLines.length * 5 + rowPadding * 2, 8);
    currentY = ensureSpace(currentY, rowHeight);

    pdf.setDrawColor(220);
    pdf.setFont("helvetica", "normal");
    pdf.rect(columnX[0], currentY - 4, columnWidths[0], rowHeight);
    pdf.rect(columnX[1], currentY - 4, columnWidths[1], rowHeight);
    pdf.rect(columnX[2], currentY - 4, columnWidths[2], rowHeight);
    pdf.rect(columnX[3], currentY - 4, columnWidths[3], rowHeight);
    pdf.rect(columnX[4], currentY - 4, columnWidths[4], rowHeight);

    pdf.text(String(row.codigo || "-"), columnX[0] + 1, currentY + 1);
    pdf.text(descriptionLines, columnX[1] + 1, currentY + 1);
    pdf.text(formatMoney(row.precioUnitario), columnX[2] + 1, currentY + 1);
    pdf.text(row.unidades.toFixed(1), columnX[3] + 1, currentY + 1);
    pdf.text(formatMoney(row.subtotal), columnX[4] + 1, currentY + 1);

    currentY += rowHeight;
  });

  currentY = ensureSpace(currentY + 8, 18);
  pdf.setFont("helvetica", "bold");
  pdf.text(
    `Total: ${formatMoney(result.summary.subtotalCalculado)}`,
    marginLeft,
    currentY + 4,
  );

  pdf.save(fileName);
};
