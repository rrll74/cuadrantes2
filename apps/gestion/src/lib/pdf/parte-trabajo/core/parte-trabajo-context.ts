import type jsPDF from "jspdf";
import type { PdfLayout } from "./parte-trabajo-layout";

export interface PdfContext {
  pdf: jsPDF;
  layout: PdfLayout;
  yPosition: number;
}

export const checkNewPage = (ctx: PdfContext, requiredSpace: number) => {
  if (
    ctx.yPosition + requiredSpace >
    ctx.layout.pageHeight - ctx.layout.margin
  ) {
    ctx.pdf.addPage();
    ctx.yPosition = ctx.layout.margin;
    return true;
  }
  return false;
};
