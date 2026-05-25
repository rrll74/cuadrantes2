import { exportDistributionToExcel } from "./export-excel";
import type { DistributionResult } from "./types";

const mockAoaToSheet = jest.fn();
const mockBookNew = jest.fn();
const mockBookAppendSheet = jest.fn();
const mockWriteFile = jest.fn();

jest.mock("xlsx", () => ({
  utils: {
    aoa_to_sheet: (...args: unknown[]) => mockAoaToSheet(...args),
    book_new: (...args: unknown[]) => mockBookNew(...args),
    book_append_sheet: (...args: unknown[]) => mockBookAppendSheet(...args),
  },
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
}));

const distributionResult: DistributionResult = {
  rows: [
    {
      rowNumber: 2,
      codigo: "MAT01",
      descripcion: "Arena fina",
      precioUnitario: 12.5,
      unidades: 5.1,
      subtotal: 63.75,
      peso: 0.2,
    },
  ],
  summary: {
    presupuestoObjetivo: 100,
    subtotalCalculado: 100,
    diferencia: 0,
    ajusteFinalAplicado: false,
  },
};

describe("export-excel dist-aut-presupuesto", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAoaToSheet.mockReturnValue({});
    mockBookNew.mockReturnValue({ wb: true });
  });

  it("genera y descarga el Excel con la información de distribución", () => {
    exportDistributionToExcel(distributionResult, "reporte.xlsx");

    expect(mockAoaToSheet).toHaveBeenCalledTimes(1);
    const rowsArg = mockAoaToSheet.mock.calls[0][0] as unknown[][];
    expect(rowsArg).toEqual(
      expect.arrayContaining([
        ["Distribución automática de presupuesto"],
        ["Presupuesto objetivo", 100],
        ["TOTAL", "", "", "", 100],
      ]),
    );

    expect(mockBookAppendSheet).toHaveBeenCalledWith(
      { wb: true },
      expect.any(Object),
      "Distribucion",
    );
    expect(mockWriteFile).toHaveBeenCalledWith({ wb: true }, "reporte.xlsx", {
      compression: true,
    });
  });
});
