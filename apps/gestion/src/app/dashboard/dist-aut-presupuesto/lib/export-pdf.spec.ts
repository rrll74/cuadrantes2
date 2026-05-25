import jsPDF from "jspdf";
import { exportDistributionToPdf } from "./export-pdf";
import type { DistributionResult } from "./types";

const pdfInstances: Array<Record<string, jest.Mock>> = [];

jest.mock("jspdf", () => {
  return jest.fn().mockImplementation(() => {
    const instance = {
      setFontSize: jest.fn(),
      setFont: jest.fn(),
      text: jest.fn(),
      setDrawColor: jest.fn(),
      setFillColor: jest.fn(),
      rect: jest.fn(),
      addPage: jest.fn(),
      splitTextToSize: jest.fn((text: string) => [text]),
      save: jest.fn(),
    };
    pdfInstances.push(instance);
    return instance;
  });
});

const baseResult: DistributionResult = {
  rows: [
    {
      rowNumber: 2,
      codigo: "MAT01",
      descripcion: "Arena fina",
      precioUnitario: 12.5,
      unidades: 2.2,
      subtotal: 27.5,
      peso: 0.3,
    },
  ],
  summary: {
    presupuestoObjetivo: 100,
    subtotalCalculado: 100,
    diferencia: 0,
    ajusteFinalAplicado: false,
  },
};

describe("export-pdf dist-aut-presupuesto", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pdfInstances.length = 0;
  });

  it("genera y guarda el PDF con nombre esperado", () => {
    exportDistributionToPdf(baseResult, "reporte.pdf");

    expect(jsPDF).toHaveBeenCalledTimes(1);
    expect(pdfInstances[0].text).toHaveBeenCalledWith(
      "Distribución automática de presupuesto",
      expect.any(Number),
      expect.any(Number),
    );
    expect(pdfInstances[0].save).toHaveBeenCalledWith("reporte.pdf");
  });

  it("agrega páginas adicionales cuando la tabla desborda", () => {
    const largeResult: DistributionResult = {
      ...baseResult,
      rows: Array.from({ length: 80 }, (_, index) => ({
        rowNumber: index + 2,
        codigo: `MAT${index + 1}`,
        descripcion: `Material ${index + 1}`,
        precioUnitario: 10,
        unidades: 1.1,
        subtotal: 11,
        peso: 0.2,
      })),
    };

    exportDistributionToPdf(largeResult, "grande.pdf");

    expect(pdfInstances[0].addPage).toHaveBeenCalled();
    expect(pdfInstances[0].save).toHaveBeenCalledWith("grande.pdf");
  });
});
