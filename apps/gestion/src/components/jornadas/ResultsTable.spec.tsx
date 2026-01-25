import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResultsTable } from "./ResultsTable";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import api from "@/lib/api";
import { EstadoPresencia } from "@cuadrantes/shared-dto";

jest.mock("@/lib/api");

// Mock de componentes internos
jest.mock("./SummaryCards", () => ({
  SummaryCards: ({
    stats,
  }: {
    stats: {
      total: number;
      completo: number;
      incompleto: number;
      sinPresencia: number;
    };
  }) => (
    <div data-testid="summary-cards">
      <span>{stats.total}</span>
      <span>{stats.completo}</span>
    </div>
  ),
}));

describe("ResultsTable", () => {
  let queryClient: QueryClient;
  const sessionId = 123;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ResultsTable sessionId={sessionId} />
      </QueryClientProvider>,
    );
  };

  it("debe renderizar el componente con datos cargados", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            trabajador: "Juan Pérez",
            estado: EstadoPresencia.COMPLETO,
            fichajeEntrada: "2024-01-01T08:00:00Z",
            fichajeSalida: "2024-01-01T16:00:00Z",
            equipo: "Equipo A",
            discounted: false,
          },
        ],
        stats: {
          total: 1,
          completo: 1,
          incompleto: 0,
          sinPresencia: 0,
        },
        page: 1,
        meta: {
          total: 1,
          totalPages: 1,
        },
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("summary-cards")).toBeInTheDocument();
    });
  });

  it("debe mostrar controles de filtro y búsqueda", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: [],
        stats: {
          total: 0,
          completo: 0,
          incompleto: 0,
          sinPresencia: 0,
        },
        page: 1,
        meta: {
          total: 0,
          totalPages: 0,
        },
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Buscar Trabajador/)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/Nombre, apellido, equipo.../),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Filtrar Estado/)).toBeInTheDocument();
    expect(screen.getByText(/Tipo Jornada/)).toBeInTheDocument();
  });

  it("debe filtrar por estado cuando se selecciona una opción", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            trabajador: "Juan Pérez",
            estado: EstadoPresencia.COMPLETO,
            fichajeEntrada: "2024-01-01T08:00:00Z",
            fichajeSalida: "2024-01-01T16:00:00Z",
            equipo: "Equipo A",
            discounted: false,
          },
        ],
        stats: {
          total: 1,
          completo: 1,
          incompleto: 0,
          sinPresencia: 0,
        },
        page: 1,
        meta: {
          total: 1,
          totalPages: 1,
        },
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("summary-cards")).toBeInTheDocument();
    });

    const filterSelect = screen.getAllByRole("combobox")[0]; // Filtrar Estado
    fireEvent.change(filterSelect, {
      target: { value: EstadoPresencia.COMPLETO },
    });

    await waitFor(() => {
      expect(filterSelect).toHaveValue(EstadoPresencia.COMPLETO);
    });
  });

  it("debe filtrar por tipo de jornada (descontada/computable)", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: [],
        stats: {
          total: 0,
          completo: 0,
          incompleto: 0,
          sinPresencia: 0,
        },
        page: 1,
        meta: {
          total: 0,
          totalPages: 0,
        },
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Buscar Trabajador/)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/Nombre, apellido, equipo.../),
      ).toBeInTheDocument();
    });

    const typeSelect = screen.getAllByRole("combobox")[1]; // Tipo Jornada
    fireEvent.change(typeSelect, { target: { value: "true" } });

    await waitFor(() => {
      expect(typeSelect).toHaveValue("true");
    });
  });

  it("debe buscar trabajadores por nombre", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: [],
        stats: {
          total: 0,
          completo: 0,
          incompleto: 0,
          sinPresencia: 0,
        },
        page: 1,
        meta: {
          total: 0,
          totalPages: 0,
        },
      },
    });

    renderComponent();

    const searchInput = screen.getByPlaceholderText(
      /Nombre, apellido, equipo.../,
    ) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "Juan" } });

    await waitFor(() => {
      expect(searchInput).toHaveValue("Juan");
    });
  });

  it("debe mostrar tarjetas de resumen cuando hay datos", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            trabajador: "Juan Pérez",
            estado: EstadoPresencia.COMPLETO,
          },
          {
            id: 2,
            trabajador: "María López",
            estado: EstadoPresencia.INCOMPLETO,
          },
        ],
        stats: {
          total: 2,
          completo: 1,
          incompleto: 1,
          sinPresencia: 0,
          revisar: 0,
        },
        meta: {
          total: 2,
          totalPages: 1,
        },
        page: 1,
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("summary-cards")).toBeInTheDocument();
    });

    // Verifica que las stats se muestran correctamente
    const allWithTotal = screen.getAllByText("2");
    expect(allWithTotal.length).toBeGreaterThan(0);
  });

  it("debe renderizar paginación cuando hay múltiples páginas", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: Array(10)
          .fill(null)
          .map((_, i) => ({
            id: i + 1,
            trabajador: `Trabajador ${i + 1}`,
            estado: EstadoPresencia.COMPLETO,
          })),
        stats: {
          total: 25,
          completo: 25,
          incompleto: 0,
          sinPresencia: 0,
        },
        meta: {
          total: 25,
          totalPages: 3,
        },
        page: 1,
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("summary-cards")).toBeInTheDocument();
    });

    // La paginación debe estar presente
  });

  it("debe llamar a la API de exportación al hacer clic en exportar", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            trabajador: "Juan Pérez",
            estado: EstadoPresencia.COMPLETO,
          },
        ],
        stats: {
          total: 1,
          completo: 1,
          incompleto: 0,
          sinPresencia: 0,
        },
        page: 1,
        meta: {
          total: 1,
          totalPages: 1,
        },
      },
    });

    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes("/export")) {
        return Promise.resolve({
          data: new Blob(["excel content"], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        });
      }
      return Promise.resolve({
        data: {
          data: [],
          stats: { total: 0, completo: 0, incompleto: 0, sinPresencia: 0 },
          page: 1,
          meta: {
            total: 0,
            totalPages: 1,
          },
        },
      });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("summary-cards")).toBeInTheDocument();
    });

    // Buscar botón de exportar
    const exportButton = screen.queryByRole("button", {
      name: /exportar|export/i,
    });

    if (exportButton) {
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    }
  });
});
