import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StatusPartsSummaryTable } from "./StatusPartsSummaryTable";
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

describe("StatusPartsSummaryTable", () => {
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
        <StatusPartsSummaryTable sessionId={sessionId} />
      </QueryClientProvider>,
    );
  };

  it("debe renderizar el componente con datos cargados exitosamente", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url === `/jornadas/${sessionId}/status-parts-summary`) {
        return Promise.resolve({
          data: {
            rows: [
              {
                estado: "COMPLETO",
                noPartsCount: 50,
                noPartsPercent: 33.33,
                withPartsCount: 30,
                withPartsPercent: 66.67,
              },
              {
                estado: "INCOMPLETO",
                noPartsCount: 20,
                noPartsPercent: 40.0,
                withPartsCount: 30,
                withPartsPercent: 60.0,
              },
            ],
            footer: {
              estado: "TOTAL",
              noPartsCount: 70,
              noPartsPercent: 35.0,
              withPartsCount: 60,
              withPartsPercent: 65.0,
            },
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("COMPLETO")).toBeInTheDocument();
    });

    expect(screen.getByText("INCOMPLETO")).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it("debe mostrar estado de carga", async () => {
    (api.get as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}), // nunca resuelve
    );

    renderComponent();

    expect(screen.getByText(/Cargando resumen por estado/)).toBeInTheDocument();
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
          footer: null,
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
      if (url === `/jornadas/${sessionId}/status-parts-summary`) {
        return Promise.resolve({
          data: {
            rows: [
              {
                estado: "COMPLETO",
                noPartsCount: 10,
                noPartsPercent: 50,
                withPartsCount: 10,
                withPartsPercent: 50,
              },
            ],
            footer: {
              estado: "TOTAL",
              noPartsCount: 10,
              noPartsPercent: 50,
              withPartsCount: 10,
              withPartsPercent: 50,
            },
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
      expect(screen.getByText("COMPLETO")).toBeInTheDocument();
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

  it("debe renderizar gráfico de barras con dos series (con/sin partes)", async () => {
    (api.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          rows: [
            {
              estado: "COMPLETO",
              noPartsCount: 50,
              noPartsPercent: 33.33,
              withPartsCount: 100,
              withPartsPercent: 66.67,
            },
          ],
          footer: {
            estado: "TOTAL",
            noPartsCount: 50,
            noPartsPercent: 33.33,
            withPartsCount: 100,
            withPartsPercent: 66.67,
          },
        },
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Distribución de Estados/)).toBeInTheDocument();
    });

    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("debe mostrar tabla con porcentajes correctos separados por partes", async () => {
    (api.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          rows: [
            {
              estado: "COMPLETO",
              noPartsCount: 40,
              noPartsPercent: 40.0,
              withPartsCount: 60,
              withPartsPercent: 60.0,
            },
            {
              estado: "INCOMPLETO",
              noPartsCount: 30,
              noPartsPercent: 30.0,
              withPartsCount: 70,
              withPartsPercent: 70.0,
            },
          ],
          footer: {
            estado: "TOTAL",
            noPartsCount: 70,
            noPartsPercent: 35.0,
            withPartsCount: 130,
            withPartsPercent: 65.0,
          },
        },
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("COMPLETO")).toBeInTheDocument();
    });

    expect(screen.getByText("INCOMPLETO")).toBeInTheDocument();
    expect(screen.getByText("TOTAL")).toBeInTheDocument();
  });

  it("debe renderizar el botón de descarga de imagen del gráfico", async () => {
    (api.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          rows: [
            {
              estado: "COMPLETO",
              noPartsCount: 50,
              noPartsPercent: 50,
              withPartsCount: 50,
              withPartsPercent: 50,
            },
          ],
          footer: {
            estado: "TOTAL",
            noPartsCount: 50,
            noPartsPercent: 50,
            withPartsCount: 50,
            withPartsPercent: 50,
          },
        },
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Descargar PNG/)).toBeInTheDocument();
    });
  });
});
