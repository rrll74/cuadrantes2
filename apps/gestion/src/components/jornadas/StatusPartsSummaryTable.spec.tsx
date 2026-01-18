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

  it("debe renderizar el botón de exportar y llamar a la API al hacer clic", async () => {
    // Configurar mocks de API
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url === `/jornadas/${sessionId}/status-parts-summary`) {
        return Promise.resolve({
          data: {
            rows: [
              {
                estado: "completo",
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

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByText("completo")).toBeInTheDocument();
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
});
