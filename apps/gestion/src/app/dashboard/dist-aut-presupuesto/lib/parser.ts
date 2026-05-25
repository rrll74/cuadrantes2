import * as XLSX from "xlsx";
import type {
  MaterialInputRow,
  MaterialValidationError,
  ParsedMaterialsResult,
} from "./types";

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, "")
    .replace(/\s+/g, "");

const normalizeDescription = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

const parsePrice = (value: unknown) => {
  const raw = String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");

  if (!raw) {
    return Number.NaN;
  }

  return Number(raw);
};

export const parseMaterialsWorkbook = async (
  file: File,
): Promise<ParsedMaterialsResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return {
      materials: [],
      errors: [
        {
          field: "file",
          message: "El Excel no contiene hojas válidas.",
        },
      ],
      sheetName: "",
    };
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as unknown[][];

  const headerRow = rows[0] ?? [];
  const headerMap = new Map<string, number>();

  headerRow.forEach((header, index) => {
    headerMap.set(normalizeHeader(header), index);
  });

  const descripcionIndex = headerMap.get("descripcion");
  const precioIndex = headerMap.get("preciounitario");
  const codigoIndex = headerMap.get("codigo");
  const errors: MaterialValidationError[] = [];

  if (descripcionIndex === undefined) {
    errors.push({
      field: "descripcion",
      message: "Falta la columna obligatoria descripcion.",
    });
  }

  if (precioIndex === undefined) {
    errors.push({
      field: "precio_unitario",
      message: "Falta la columna obligatoria precio_unitario.",
    });
  }

  if (errors.length > 0) {
    return { materials: [], errors, sheetName };
  }

  const descripcionColumnIndex = descripcionIndex as number;
  const precioColumnIndex = precioIndex as number;
  const codigoColumnIndex = codigoIndex as number | undefined;

  const materials: MaterialInputRow[] = [];
  const seenDescriptions = new Set<string>();

  rows.slice(1).forEach((row, rowIndex) => {
    const excelRowNumber = rowIndex + 2;
    const descripcion = normalizeDescription(row[descripcionColumnIndex]);
    const codigoRaw =
      codigoColumnIndex !== undefined ? row[codigoColumnIndex] : "";
    const precioUnitario = parsePrice(row[precioColumnIndex]);

    const hasAnyValue = row.some((cell) => String(cell ?? "").trim() !== "");
    if (!hasAnyValue) {
      return;
    }

    if (!descripcion) {
      errors.push({
        rowNumber: excelRowNumber,
        field: "descripcion",
        message: "La descripcion es obligatoria.",
      });
      return;
    }

    if (seenDescriptions.has(descripcion)) {
      errors.push({
        rowNumber: excelRowNumber,
        field: "descripcion",
        message: `La descripcion "${descripcion}" está duplicada.`,
      });
      return;
    }

    if (!Number.isFinite(precioUnitario) || precioUnitario <= 0) {
      errors.push({
        rowNumber: excelRowNumber,
        field: "precio_unitario",
        message: "El precio_unitario debe ser un número mayor que 0.",
      });
      return;
    }

    seenDescriptions.add(descripcion);

    materials.push({
      rowNumber: excelRowNumber,
      codigo: String(codigoRaw ?? "").trim() || null,
      descripcion,
      precioUnitario,
    });
  });

  return {
    materials,
    errors,
    sheetName,
  };
};
