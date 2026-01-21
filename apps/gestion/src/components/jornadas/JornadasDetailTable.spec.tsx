import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { JornadasDetailTable } from "./JornadasDetailTable";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import api from "@/lib/api";

// Mock de la API
jest.mock("@/lib/api");

// Mock de Recharts
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  // Renderizamos un SVG para que la lógica de descarga lo encuentre
  LineChart: () => <svg data-testid="line-chart">LineChart Mock</svg>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe("JornadasDetailTable", () => {
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
        <JornadasDetailTable sessionId={sessionId} />
      </QueryClientProvider>,
    );
  };

  it("debe renderizar el componente con datos cargados exitosamente", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url === `/jornadas/${sessionId}/table-detail`) {
        return Promise.resolve({
          data: {
            columns: [
              { key: "2023-10-27", label: "27 V" },
              { key: "2023-10-28", label: "28 S" },
            ],
            rows: [
              {
                servicio: "Servicio A",
                equipo: "Equipo 1",
                total: 20,
                "2023-10-27_value": 8,
                "2023-10-27_color": "GREEN",
                "2023-10-28_value": 12,
                "2023-10-28_color": "YELLOW",
              },
            ],
            footer: {
              servicio: "TOTAL",
              equipo: "",
              total: 20,
              "2023-10-27_value": 8,
              "2023-10-28_value": 12,
            },
            discountedRows: [
              {
                servicio: "Servicio B",
                equipo: "Equipo 2",
                total: 5,
                "2023-10-27_value": 5,
              },
            ],
            discountedFooter: {
              servicio: "TOTAL DESCONTADO",
              equipo: "",
              total: 5,
              "2023-10-27_value": 5,
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

    expect(screen.getByText("Tabla Detallada por Equipos")).toBeInTheDocument();
    expect(screen.getByText("Servicio A")).toBeInTheDocument();
    expect(screen.getByText("Equipo 1")).toBeInTheDocument();
  });

  it("debe mostrar estado de carga", async () => {
    (api.get as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}), // nunca resuelve
    );

    renderComponent();

    expect(screen.getByText(/Cargando tabla detallada/)).toBeInTheDocument();
  });

  it("debe mostrar mensaje de error cuando falla la API", async () => {
    (api.get as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error("API Error")),
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/Error al cargar los datos de la tabla detallada/),
      ).toBeInTheDocument();
    });
  });

  it("debe mostrar mensaje cuando no hay datos", async () => {
    (api.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          columns: [],
          rows: [],
        },
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(
          /No hay datos disponibles para generar la tabla detallada/,
        ),
      ).toBeInTheDocument();
    });
  });

  it("debe renderizar el botón de exportar y llamar a la API al hacer clic", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url === `/jornadas/${sessionId}/table-detail`) {
        return Promise.resolve({
          data: {
            columns: [{ key: "2023-10-27", label: "27 V" }],
            rows: [
              {
                servicio: "Servicio A",
                equipo: "Equipo 1",
                total: 1,
                "2023-10-27": 1,
              },
            ],
            footer: {
              servicio: "TOTAL",
              equipo: "",
              total: 1,
              "2023-10-27": 1,
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

  it("debe renderizar el gráfico de evolución con múltiples fechas", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url === `/jornadas/${sessionId}/table-detail`) {
        return Promise.resolve({
          data: {
            columns: [
              { key: "2023-10-27", label: "27 V" },
              { key: "2023-10-28", label: "28 S" },
              { key: "2023-10-29", label: "29 D" },
            ],
            rows: [],
            footer: {
              servicio: "TOTAL",
              equipo: "",
              total: 30,
              "2023-10-27_value": 10,
              "2023-10-28_value": 10,
              "2023-10-29_value": 10,
            },
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("Evolución de Jornadas por Día"),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("debe mostrar tabla de equipos descontados cuando existan", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url === `/jornadas/${sessionId}/table-detail`) {
        return Promise.resolve({
          data: {
            columns: [{ key: "2023-10-27", label: "27 V" }],
            rows: [
              {
                servicio: "Servicio A",
                equipo: "Equipo 1",
                total: 10,
                "2023-10-27_value": 10,
              },
            ],
            footer: {
              servicio: "TOTAL",
              equipo: "",
              total: 10,
              "2023-10-27_value": 10,
            },
            discountedRows: [
              {
                servicio: "Servicio B",
                equipo: "Equipo 2",
                total: 5,
                "2023-10-27_value": 5,
              },
            ],
            discountedFooter: {
              servicio: "TOTAL DESCONTADO",
              equipo: "",
              total: 5,
              "2023-10-27_value": 5,
            },
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("Equipos Descontados (No computan)"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Servicio B")).toBeInTheDocument();
    expect(screen.getByText("Equipo 2")).toBeInTheDocument();
  });

  it("debe renderizar el botón de descarga de imagen", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url === `/jornadas/${sessionId}/table-detail`) {
        return Promise.resolve({
          data: {
            columns: [{ key: "2023-10-27", label: "27 V" }],
            rows: [],
            footer: {
              servicio: "TOTAL",
              equipo: "",
              total: 10,
              "2023-10-27_value": 10,
            },
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Descargar PNG")).toBeInTheDocument();
    });
  });
});
