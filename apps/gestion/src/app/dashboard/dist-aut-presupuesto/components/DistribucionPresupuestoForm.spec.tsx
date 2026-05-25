import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DistribucionPresupuestoForm } from "./DistribucionPresupuestoForm";
import type { DistributionResult } from "../lib/types";

const mockUseDistribucionPresupuesto = jest.fn();

jest.mock("../hooks/useDistribucionPresupuesto", () => ({
  useDistribucionPresupuesto: () => mockUseDistribucionPresupuesto(),
}));

jest.mock("./DistribucionResultadosTable", () => ({
  DistribucionResultadosTable: ({
    result,
    onExportExcel,
    onExportPdf,
    isExporting,
  }: {
    result: DistributionResult | null;
    onExportExcel: () => void;
    onExportPdf: () => void;
    isExporting: boolean;
  }) =>
    result ? (
      <div data-testid="resultados-mock">
        <button onClick={onExportExcel} disabled={isExporting}>
          Exportar Excel Mock
        </button>
        <button onClick={onExportPdf} disabled={isExporting}>
          Exportar PDF Mock
        </button>
      </div>
    ) : null,
}));

const baseHookState = {
  file: null as File | null,
  budgetTotal: "",
  materials: [],
  errors: [],
  resultInfo: null as string | null,
  distributionResult: null as DistributionResult | null,
  isParsing: false,
  isExporting: false,
  parsedBudget: Number.NaN,
  handleFileChange: jest.fn(),
  handleBudgetChange: jest.fn(),
  calculateDistribution: jest.fn().mockResolvedValue(null),
  handleExportExcel: jest.fn(),
  handleExportPdf: jest.fn(),
  reset: jest.fn(),
};

describe("DistribucionPresupuestoForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDistribucionPresupuesto.mockReturnValue({ ...baseHookState });
  });

  it("dispara handleBudgetChange al modificar el presupuesto", () => {
    const handleBudgetChange = jest.fn();
    mockUseDistribucionPresupuesto.mockReturnValue({
      ...baseHookState,
      handleBudgetChange,
    });

    render(<DistribucionPresupuestoForm />);

    fireEvent.change(screen.getByLabelText(/presupuesto objetivo/i), {
      target: { value: "1500" },
    });

    expect(handleBudgetChange).toHaveBeenCalledWith("1500");
  });

  it("dispara handleFileChange al seleccionar fichero", async () => {
    const handleFileChange = jest.fn();
    mockUseDistribucionPresupuesto.mockReturnValue({
      ...baseHookState,
      handleFileChange,
    });

    const { container } = render(<DistribucionPresupuestoForm />);
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const file = new File(["contenido"], "materiales.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(handleFileChange).toHaveBeenCalledWith(file);
    });
  });

  it("ejecuta calculateDistribution al enviar el formulario", async () => {
    const calculateDistribution = jest.fn().mockResolvedValue(null);
    mockUseDistribucionPresupuesto.mockReturnValue({
      ...baseHookState,
      file: new File(["x"], "materiales.xlsx"),
      budgetTotal: "100",
      parsedBudget: 100,
      calculateDistribution,
    });

    render(<DistribucionPresupuestoForm />);

    fireEvent.click(screen.getByRole("button", { name: /validar fichero/i }));

    await waitFor(() => {
      expect(calculateDistribution).toHaveBeenCalledTimes(1);
    });
  });

  it("ejecuta reset al pulsar limpiar", () => {
    const reset = jest.fn();
    mockUseDistribucionPresupuesto.mockReturnValue({
      ...baseHookState,
      reset,
    });

    render(<DistribucionPresupuestoForm />);

    fireEvent.click(screen.getByRole("button", { name: /limpiar/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("muestra errores de validación por fila", () => {
    mockUseDistribucionPresupuesto.mockReturnValue({
      ...baseHookState,
      errors: [
        {
          rowNumber: 3,
          field: "descripcion",
          message: "La descripcion está duplicada.",
        },
      ],
    });

    render(<DistribucionPresupuestoForm />);

    expect(screen.getByText(/fila 3:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/la descripcion está duplicada/i),
    ).toBeInTheDocument();
  });

  it("permite exportar cuando hay distribución", () => {
    const handleExportExcel = jest.fn();
    const handleExportPdf = jest.fn();
    mockUseDistribucionPresupuesto.mockReturnValue({
      ...baseHookState,
      distributionResult: {
        rows: [
          {
            rowNumber: 2,
            codigo: "MAT01",
            descripcion: "Arena fina",
            precioUnitario: 12.5,
            unidades: 2,
            subtotal: 25,
            peso: 0.2,
          },
        ],
        summary: {
          presupuestoObjetivo: 100,
          subtotalCalculado: 100,
          diferencia: 0,
          ajusteFinalAplicado: false,
        },
      },
      handleExportExcel,
      handleExportPdf,
    });

    render(<DistribucionPresupuestoForm />);

    fireEvent.click(
      screen.getByRole("button", { name: /exportar excel mock/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /exportar pdf mock/i }));

    expect(handleExportExcel).toHaveBeenCalledTimes(1);
    expect(handleExportPdf).toHaveBeenCalledTimes(1);
  });
});
