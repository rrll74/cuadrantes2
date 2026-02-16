import type jsPDF from "jspdf";
import { checkNewPage, type PdfContext } from "../core/parte-trabajo-context";

type FieldBoxOptions = {
  minBoxHeight?: number;
};

const ensureLines = (pdf: jsPDF, text: string, width: number) => {
  const lines = pdf.splitTextToSize(text || "", width) as string[];
  return lines.length > 0 ? lines : [""];
};

const buildLabelLines = (pdf: jsPDF, label: string, width: number) =>
  label.split("\n").flatMap((line) => ensureLines(pdf, line || "", width));

const calculateBoxHeight = (
  ctx: PdfContext,
  labelLinesCount: number,
  valueLinesCount: number,
  minBoxHeight: number,
) => {
  const { paddingY, lineHeight, labelValueGap } = ctx.layout;
  const computedHeight =
    paddingY +
    labelLinesCount * lineHeight +
    labelValueGap +
    valueLinesCount * lineHeight +
    paddingY;
  return Math.max(minBoxHeight, computedHeight);
};

export const addFieldBox = (
  ctx: PdfContext,
  label: string,
  value: string,
  options: FieldBoxOptions = {},
) => {
  const { margin, contentWidth, paddingX, labelFontSize, valueFontSize } =
    ctx.layout;
  const labelWidth = contentWidth - paddingX * 2;
  const valueWidth = contentWidth - paddingX * 2;

  ctx.pdf.setFont("helvetica", "normal");
  ctx.pdf.setFontSize(valueFontSize);
  const valueLines = ensureLines(ctx.pdf, value || "", valueWidth);
  const labelLines = buildLabelLines(ctx.pdf, label, labelWidth);

  const boxHeight = calculateBoxHeight(
    ctx,
    labelLines.length || 1,
    valueLines.length || 1,
    options.minBoxHeight ?? 0,
  );

  checkNewPage(ctx, boxHeight + 1);

  ctx.pdf.setDrawColor(100, 100, 100);
  ctx.pdf.setLineWidth(0.3);
  ctx.pdf.rect(margin, ctx.yPosition, contentWidth, boxHeight);

  ctx.pdf.setFont("helvetica", "bold");
  ctx.pdf.setFontSize(labelFontSize);
  labelLines.forEach((line, idx) => {
    ctx.pdf.text(
      line,
      margin + paddingX,
      ctx.yPosition +
        ctx.layout.paddingY +
        (idx + 1) * ctx.layout.lineHeight -
        1,
    );
  });

  ctx.pdf.setFont("helvetica", "normal");
  ctx.pdf.setFontSize(valueFontSize);
  valueLines.forEach((line, idx) => {
    ctx.pdf.text(
      line,
      margin + paddingX,
      ctx.yPosition +
        ctx.layout.paddingY +
        labelLines.length * ctx.layout.lineHeight +
        ctx.layout.labelValueGap +
        (idx + 1) * ctx.layout.lineHeight -
        1,
    );
  });

  ctx.yPosition += boxHeight + 1;
};

export const addThreeFieldsInLine = (
  ctx: PdfContext,
  label1: string,
  value1: string,
  label2: string,
  value2: string,
  label3: string,
  value3: string,
) => {
  const { contentWidth, paddingX, labelFontSize, valueFontSize } = ctx.layout;
  const fieldWidth = contentWidth / 3 - 0.5;
  const valueWidth = fieldWidth - paddingX * 2;
  const labelWidth = fieldWidth - paddingX * 2;

  ctx.pdf.setFont("helvetica", "normal");
  ctx.pdf.setFontSize(valueFontSize);
  const valueLines1 = ensureLines(ctx.pdf, value1 || "", valueWidth);
  const valueLines2 = ensureLines(ctx.pdf, value2 || "", valueWidth);
  const valueLines3 = ensureLines(ctx.pdf, value3 || "", valueWidth);
  const labelLines1 = buildLabelLines(ctx.pdf, label1, labelWidth);
  const labelLines2 = buildLabelLines(ctx.pdf, label2, labelWidth);
  const labelLines3 = buildLabelLines(ctx.pdf, label3, labelWidth);

  const maxValueLines = Math.max(
    valueLines1.length,
    valueLines2.length,
    valueLines3.length,
  );
  const maxLabelLines = Math.max(
    labelLines1.length,
    labelLines2.length,
    labelLines3.length,
  );

  const boxHeight = calculateBoxHeight(ctx, maxLabelLines, maxValueLines, 0);

  checkNewPage(ctx, boxHeight + 1);

  const drawField = (x: number, labelLines: string[], valueLines: string[]) => {
    ctx.pdf.setDrawColor(100, 100, 100);
    ctx.pdf.setLineWidth(0.3);
    ctx.pdf.rect(x, ctx.yPosition, fieldWidth, boxHeight);

    ctx.pdf.setFont("helvetica", "bold");
    ctx.pdf.setFontSize(labelFontSize);
    labelLines.forEach((line, idx) => {
      ctx.pdf.text(
        line,
        x + paddingX,
        ctx.yPosition +
          ctx.layout.paddingY +
          (idx + 1) * ctx.layout.lineHeight -
          1,
      );
    });

    ctx.pdf.setFont("helvetica", "normal");
    ctx.pdf.setFontSize(valueFontSize);
    valueLines.forEach((line, idx) => {
      ctx.pdf.text(
        line,
        x + paddingX,
        ctx.yPosition +
          ctx.layout.paddingY +
          labelLines.length * ctx.layout.lineHeight +
          ctx.layout.labelValueGap +
          (idx + 1) * ctx.layout.lineHeight -
          1,
      );
    });
  };

  drawField(ctx.layout.margin, labelLines1, valueLines1);

  const x2 = ctx.layout.margin + fieldWidth + 1;
  drawField(x2, labelLines2, valueLines2);

  const x3 = ctx.layout.margin + 2 * fieldWidth + 2;
  drawField(x3, labelLines3, valueLines3);

  ctx.yPosition += boxHeight + 1;
};

export const addTwoFieldsInLine = (
  ctx: PdfContext,
  label1: string,
  value1: string,
  percentWidth1: number,
  label2: string,
  value2: string,
  percentWidth2: number,
  minBoxHeight: number = 0,
) => {
  const { contentWidth, paddingX, labelFontSize, valueFontSize } = ctx.layout;
  const field1Width = (contentWidth * percentWidth1) / 100 - 0.5;
  const field2Width = (contentWidth * percentWidth2) / 100 - 0.5;
  const valueWidth1 = field1Width - paddingX * 2;
  const valueWidth2 = field2Width - paddingX * 2;
  const labelWidth1 = field1Width - paddingX * 2;
  const labelWidth2 = field2Width - paddingX * 2;

  ctx.pdf.setFont("helvetica", "normal");
  ctx.pdf.setFontSize(valueFontSize);
  const valueLines1 = ensureLines(ctx.pdf, value1 || "", valueWidth1);
  const valueLines2 = ensureLines(ctx.pdf, value2 || "", valueWidth2);
  const labelLines1 = buildLabelLines(ctx.pdf, label1, labelWidth1);
  const labelLines2 = buildLabelLines(ctx.pdf, label2, labelWidth2);

  const boxHeight = calculateBoxHeight(
    ctx,
    Math.max(labelLines1.length, labelLines2.length),
    Math.max(valueLines1.length, valueLines2.length),
    minBoxHeight,
  );

  checkNewPage(ctx, boxHeight + 1);

  const drawField = (
    x: number,
    width: number,
    labelLines: string[],
    valueLines: string[],
  ) => {
    ctx.pdf.setDrawColor(100, 100, 100);
    ctx.pdf.setLineWidth(0.3);
    ctx.pdf.rect(x, ctx.yPosition, width, boxHeight);

    ctx.pdf.setFont("helvetica", "bold");
    ctx.pdf.setFontSize(labelFontSize);
    labelLines.forEach((line, idx) => {
      ctx.pdf.text(
        line,
        x + paddingX,
        ctx.yPosition +
          ctx.layout.paddingY +
          (idx + 1) * ctx.layout.lineHeight -
          1,
      );
    });

    ctx.pdf.setFont("helvetica", "normal");
    ctx.pdf.setFontSize(valueFontSize);
    valueLines.forEach((line, idx) => {
      ctx.pdf.text(
        line,
        x + paddingX,
        ctx.yPosition +
          ctx.layout.paddingY +
          labelLines.length * ctx.layout.lineHeight +
          ctx.layout.labelValueGap +
          (idx + 1) * ctx.layout.lineHeight -
          1,
      );
    });
  };

  drawField(ctx.layout.margin, field1Width, labelLines1, valueLines1);

  const x2 = ctx.layout.margin + field1Width + 1;
  drawField(x2, field2Width, labelLines2, valueLines2);

  ctx.yPosition += boxHeight + 1;
};
