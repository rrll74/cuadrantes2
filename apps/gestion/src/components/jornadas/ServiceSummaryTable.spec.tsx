import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ServiceSummaryTable } from "./ServiceSummaryTable";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import api from "@/lib/api";

// Mock de la API
jest.mock("@/lib/api");

// Mock de Recharts para evitar problemas de renderizado en tests
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: () => <div data-testid="bar-chart">BarChart Mock</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe("ServiceSummaryTable", () => {
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
        <ServiceSummaryTable sessionId={sessionId} />
      </QueryClientProvider>,
    );
  };

  it("debe renderizar el componente con datos cargados exitosamente", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url === `/jornadas/${sessionId}/service-summary`) {
        return Promise.resolve({
          data: {
            rows: [
              { servicio: "Servicio A", jornadas: 10.5 },
              { servicio: "Servicio B", jornadas: 5.25 },
              { servicio: "Sin Servicio", jornadas: 2.75 },
            ],
            total: 18.5,
            discountedRows: [{ servicio: "Servicio C", jornadas: 3.0 }],
            discountedTotal: 3.0,
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

    await waitFor(() => {
      expect(screen.getByText("Servicio A")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Resumen de Jornadas por Servicio"),
    ).toBeInTheDocument();
    expect(screen.getByText("Servicio B")).toBeInTheDocument();
    expect(screen.getByText(/Total Jornadas: 18.50/)).toBeInTheDocument();
  });

  it("debe mostrar estado de carga", async () => {
    (api.get as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}), // nunca resuelve
    );

    renderComponent();

    expect(
      screen.getByText(/Cargando resumen por servicios/),
    ).toBeInTheDocument();
  });

  it("debe mostrar mensaje de error cuando falla la API", async () => {
    (api.get as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error("API Error")),
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/Error al cargar los datos del resumen por servicios/),
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
      if (url === `/jornadas/${sessionId}/service-summary`) {
        return Promise.resolve({
          data: {
            rows: [
              { servicio: "Servicio A", jornadas: 10 },
              { servicio: "Servicio B", jornadas: 5 },
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
      expect(screen.getByText("Servicio A")).toBeInTheDocument();
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

  it("debe renderizar gráfico de barras horizontal", async () => {
    (api.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          rows: [
            { servicio: "Servicio A", jornadas: 10 },
            { servicio: "Servicio B", jornadas: 5 },
          ],
          total: 15,
        },
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("Comparativa de Jornadas por Servicio"),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("debe mostrar servicios descontados cuando existan", async () => {
    (api.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          rows: [{ servicio: "Servicio A", jornadas: 10 }],
          total: 10,
          discountedRows: [{ servicio: "Servicio Descuento", jornadas: 2 }],
          discountedTotal: 2,
        },
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("Servicios Descontados (No computan)"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Servicio Descuento")).toBeInTheDocument();
  });

  it("debe incluir información de sesión cuando está disponible", async () => {
    (api.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          rows: [{ servicio: "Servicio A", jornadas: 10 }],
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
      expect(screen.getByText("Servicio A")).toBeInTheDocument();
    });

    // MinimumJourneysTable debe renderizarse sin errores
  });
});
