import { A4_HEIGHT_MM, A4_WIDTH_MM, DEFAULT_MARGIN_MM } from "../constants";

export interface PdfLayout {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  labelFontSize: number;
  valueFontSize: number;
  lineHeight: number;
  paddingY: number;
  paddingX: number;
  labelValueGap: number;
}

export const createDefaultLayout = (): PdfLayout => ({
  pageWidth: A4_WIDTH_MM,
  pageHeight: A4_HEIGHT_MM,
  margin: DEFAULT_MARGIN_MM,
  contentWidth: A4_WIDTH_MM - 2 * DEFAULT_MARGIN_MM,
  labelFontSize: 11,
  valueFontSize: 11,
  lineHeight: 4.5,
  paddingY: 2,
  paddingX: 2,
  labelValueGap: 1,
});
