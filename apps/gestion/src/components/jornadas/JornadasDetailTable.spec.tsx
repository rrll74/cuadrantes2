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

  it("debe renderizar el botón de exportar y llamar a la API al hacer clic", async () => {
    // Configurar mocks de API
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

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByText("Servicio A")).toBeInTheDocument();
    });

    // Verificar que el botón de exportar está presente
    const exportButton = screen.getByRole("button", {
      name: /exportar excel/i,
    });
    expect(exportButton).toBeInTheDocument();

    // Simular clic en exportar
    fireEvent.click(exportButton);

    // Verificar que se llamó a la API de exportación
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/jornadas/${sessionId}/export`, {
        responseType: "blob",
      });
    });
  });

  it("debe renderizar el gráfico de líneas", async () => {
    // Configurar mocks de API
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
              "2023-10-27": 10,
            },
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    renderComponent();

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(
        screen.getByText("Evolución de Jornadas por Día"),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("debe renderizar el botón de descarga de imagen y funcionar correctamente", async () => {
    // Configurar mocks para Canvas y XMLSerializer
    const mockToDataURL = jest.fn(() => "data:image/png;base64,test");
    const mockDrawImage = jest.fn();
    const mockFillRect = jest.fn();

    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillStyle: "",
      fillRect: mockFillRect,
      drawImage: mockDrawImage,
    } as unknown as CanvasRenderingContext2D);
    jest
      .spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockImplementation(mockToDataURL);

    global.XMLSerializer = jest.fn().mockImplementation(() => ({
      serializeToString: () => "<svg></svg>",
    }));

    // Mock Image
    // @ts-expect-error - Mock de Image para testing
    global.Image = class {
      onload?: () => void;
      set src(val: string) {
        if (this.onload) this.onload();
      }
    };

    // Mock click en enlace de descarga
    const mockLinkClick = jest.fn();
    const originalCreateElement = document.createElement.bind(document);
    jest
      .spyOn(document, "createElement")
      .mockImplementation(
        (tagName: string, options?: ElementCreationOptions) => {
          if (tagName === "a") {
            const element = originalCreateElement("a");
            jest.spyOn(element, "click").mockImplementation(mockLinkClick);
            return element;
          }
          return originalCreateElement(tagName, options);
        },
      );

    // Configurar respuesta API
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        columns: [{ key: "2023-10-27", label: "27 V" }],
        rows: [],
        footer: { servicio: "TOTAL", equipo: "", total: 10, "2023-10-27": 10 },
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Descargar PNG")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Descargar PNG"));

    expect(mockLinkClick).toHaveBeenCalled();
  });
});
