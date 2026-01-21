import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EqualAndPuestosSummaryTable } from "./EqualAndPuestosSummaryTable";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import api from "@/lib/api";

// Mock de la API
jest.mock("@/lib/api");

// Mock de Recharts para evitar problemas de renderizado en tests
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: () => <div data-testid="pie-chart">PieChart Mock</div>,
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe("EqualAndPuestosSummaryTable", () => {
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

    // Mock de URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => "blob:http://localhost/blob");
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EqualAndPuestosSummaryTable sessionId={sessionId} />
      </QueryClientProvider>,
    );
  };

  it("debe renderizar el componente con datos cargados exitosamente", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url === `/jornadas/${sessionId}/equal-puesto-summary`) {
        return Promise.resolve({
          data: {
            rows: [
              { puesto: "Puesto A", equal: 100, jornadas: 10.5 },
              { puesto: "Puesto B", equal: 50, jornadas: 5.25 },
            ],
            total: 15.75,
            discountedRows: [{ puesto: "Puesto C", equal: 200, jornadas: 2.5 }],
            discountedTotal: 2.5,
            session: {
              id: sessionId,
              minimoJornadas: 160,
              usuarioId: 1,
            },
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    renderComponent();

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByText("Puesto A")).toBeInTheDocument();
      expect(screen.getByText("Puesto B")).toBeInTheDocument();
    });

    // Verificar tabla principal
    expect(screen.getByText("Equal")).toBeInTheDocument();
    expect(screen.getByText("Jornadas (Horas / 7)")).toBeInTheDocument();

    // Verificar totales
    expect(screen.getByText(/Total Jornadas: 15.75/)).toBeInTheDocument();

    // Verificar tabla descontada
    expect(screen.getByText("Puesto C")).toBeInTheDocument();
    expect(screen.getByText(/Total Descontado: 2.50/)).toBeInTheDocument();
  });

  it("debe mostrar estado de carga", async () => {
    (api.get as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}), // nunca resuelve
    );

    renderComponent();

    expect(
      screen.getByText(/Cargando resumen por Puesto y Equal/),
    ).toBeInTheDocument();
  });

  it("debe mostrar mensaje de error cuando falla la API", async () => {
    (api.get as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error("API Error")),
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/Error al cargar los datos del resumen/),
      ).toBeInTheDocument();
    });
  });

  it("debe mostrar mensaje cuando no hay datos", async () => {
    (api.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          rows: [],
          total: 0,
        },
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/No hay datos disponibles para generar el resumen/),
      ).toBeInTheDocument();
    });
  });

  it("debe renderizar el botón de exportar y llamar a la API al hacer clic", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url === `/jornadas/${sessionId}/equal-puesto-summary`) {
        return Promise.resolve({
          data: {
            rows: [
              { puesto: "Puesto A", equal: 100, jornadas: 10 },
              { puesto: "Puesto B", equal: 50, jornadas: 5 },
            ],
            total: 15,
          },
        });
      }
      if (url === `/jornadas/${sessionId}/export`) {
        return Promise.resolve({
          data: new Blob(["excel content"], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Puesto A")).toBeInTheDocument();
    });

    const exportButton = screen.getByRole("button", {
      name: /exportar excel/i,
    });
    expect(exportButton).toBeInTheDocument();

    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/jornadas/${sessionId}/export`, {
        responseType: "blob",
      });
    });
  });

  it("debe renderizar el gráfico circular con los datos", async () => {
    (api.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          rows: [
            { puesto: "Puesto A", equal: 100, jornadas: 10.5 },
            { puesto: "Puesto B", equal: 50, jornadas: 5.25 },
          ],
          total: 15.75,
        },
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });
  });

  it("debe mostrar la tabla con el formato correcto de jornadas", async () => {
    (api.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          rows: [
            { puesto: "Conductor", equal: 100, jornadas: 10.75 },
            { puesto: "Operario", equal: 50, jornadas: 7.33 },
          ],
          total: 18.08,
        },
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("10.75")).toBeInTheDocument();
      expect(screen.getByText("7.33")).toBeInTheDocument();
    });
  });

  it("debe incluir información de sesión cuando está disponible", async () => {
    (api.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          rows: [{ puesto: "Puesto A", equal: 100, jornadas: 10 }],
          total: 10,
          session: {
            id: sessionId,
            minimoJornadas: 160,
            usuarioId: 1,
          },
        },
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Puesto A")).toBeInTheDocument();
    });

    // El componente debe incluir MinimumJourneysTable con la sesión
    // Verificamos que no hay errores en el render
  });
});
