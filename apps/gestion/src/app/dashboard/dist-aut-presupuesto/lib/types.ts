export type ExcelMaterialField =
  | "codigo"
  | "descripcion"
  | "precio_unitario"
  | "presupuesto_total"
  | "file";

export interface MaterialInputRow {
  rowNumber: number;
  codigo: string | null;
  descripcion: string;
  precioUnitario: number;
}

export interface MaterialDistributionRow extends MaterialInputRow {
  unidades: number;
  subtotal: number;
  peso: number;
}

export interface DistributionSummary {
  presupuestoObjetivo: number;
  subtotalCalculado: number;
  diferencia: number;
  ajusteFinalAplicado: boolean;
}

export interface MaterialValidationError {
  rowNumber?: number;
  field: ExcelMaterialField;
  message: string;
}

export interface ParsedMaterialsResult {
  materials: MaterialInputRow[];
  errors: MaterialValidationError[];
  sheetName: string;
}

export interface DistributionResult {
  rows: MaterialDistributionRow[];
  summary: DistributionSummary;
}
