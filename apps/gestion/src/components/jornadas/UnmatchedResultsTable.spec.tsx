import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UnmatchedResultsTable } from "./UnmatchedResultsTable";
import api from "@/lib/api";
import { EstadoPresencia } from "@cuadrantes/shared-dto";

jest.mock("@/lib/api");
jest.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: string) => value, // Returns value directly without debouncing
}));

describe("UnmatchedResultsTable", () => {
  const sessionId = 123;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe renderizar el componente con datos de resultados sin asignar", async () => {
    (api.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/stats")) {
        return Promise.resolve({
          data: {
            byStatus: { COMPLETO: 5, INCOMPLETO: 2 },
            byPuesto: { Conductor: 3, Mecanico: 2 },
          },
        });
      }
      return Promise.resolve({
        data: {
          data: [
            {
              id: 1,
              fecha: "2024-01-01",
              fichajeEntrada: "2024-01-01T08:00:00Z",
              fichajeSalida: "2024-01-01T16:00:00Z",
              estado: EstadoPresencia.COMPLETO,
              trabajador: {
                nombre: "Juan",
                apellido1: "Pérez",
                apellido2: "López",
                puesto: "Conductor",
              },
            },
          ],
          meta: {
            total: 1,
            totalPages: 1,
          },
        },
      });
    });

    render(<UnmatchedResultsTable sessionId={sessionId} />);

    await waitFor(() => {
      expect(screen.getByText("Juan Pérez López")).toBeInTheDocument();
      const puestoElements = screen.getAllByText("Conductor");
      expect(puestoElements.length).toBeGreaterThan(0);
    });
  });

  it("debe mostrar trabajadores sin asignar cuando no hay información", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes("/stats"))
        return Promise.resolve({ data: { byStatus: {}, byPuesto: {} } });
      return Promise.resolve({
        data: {
          data: [
            {
              id: 1,
              fecha: "2024-01-01",
              fichajeEntrada: null,
              fichajeSalida: null,
              estado: EstadoPresencia.SIN_PRESENCIA,
              trabajador: null,
            },
          ],
          meta: {
            total: 1,
            totalPages: 1,
          },
        },
      });
    });

    render(<UnmatchedResultsTable sessionId={sessionId} />);

    await waitFor(() => {
      const unassignedElements = screen.getAllByText("Sin asignar");
      expect(unassignedElements.length).toBeGreaterThan(0);
    });
  });

  it("debe mostrar controles de filtro y búsqueda", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes("/stats"))
        return Promise.resolve({ data: { byStatus: {}, byPuesto: {} } });
      return Promise.resolve({
        data: {
          data: [],
          meta: {
            total: 0,
            totalPages: 0,
          },
        },
      });
    });

    render(<UnmatchedResultsTable sessionId={sessionId} />);

    await waitFor(() => {
      expect(screen.getByText(/Buscar Trabajador/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/Nombre, apellido, puesto.../i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Filtrar Estado/i)).toBeInTheDocument();
    });
  });

  it("debe filtrar por estado de presencia", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes("/stats"))
        return Promise.resolve({ data: { byStatus: {}, byPuesto: {} } });
      return Promise.resolve({
        data: {
          data: [
            {
              id: 1,
              fecha: "2024-01-01",
              fichajeEntrada: "2024-01-01T08:00:00Z",
              fichajeSalida: "2024-01-01T16:00:00Z",
              estado: EstadoPresencia.COMPLETO,
              trabajador: {
                nombre: "Juan",
                apellido1: "Pérez",
                puesto: "Conductor",
              },
            },
          ],
          meta: {
            total: 1,
            totalPages: 1,
          },
        },
      });
    });

    render(<UnmatchedResultsTable sessionId={sessionId} />);

    const filterSelect = screen.getByRole("combobox");
    fireEvent.change(filterSelect, {
      target: { value: EstadoPresencia.COMPLETO },
    });

    await waitFor(() => {
      expect(filterSelect).toHaveValue(EstadoPresencia.COMPLETO);
    });
  });

  it("debe buscar trabajadores por nombre", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes("/stats"))
        return Promise.resolve({ data: { byStatus: {}, byPuesto: {} } });
      return Promise.resolve({
        data: {
          data: [
            {
              id: 1,
              fecha: "2024-01-01",
              fichajeEntrada: "2024-01-01T08:00:00Z",
              fichajeSalida: "2024-01-01T16:00:00Z",
              estado: EstadoPresencia.COMPLETO,
              trabajador: {
                nombre: "Juan",
                apellido1: "Pérez",
                puesto: "Conductor",
              },
            },
          ],
          meta: {
            total: 1,
            totalPages: 1,
          },
        },
      });
    });

    render(<UnmatchedResultsTable sessionId={sessionId} />);

    const searchInput = screen.getByPlaceholderText(
      /Nombre, apellido, puesto.../i,
    );
    fireEvent.change(searchInput, { target: { value: "Juan" } });

    await waitFor(() => {
      expect(searchInput).toHaveValue("Juan");
    });
  });

  it("debe mostrar estado COMPLETO con badge verde", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes("/stats"))
        return Promise.resolve({ data: { byStatus: {}, byPuesto: {} } });
      return Promise.resolve({
        data: {
          data: [
            {
              id: 1,
              fecha: "2024-01-01",
              fichajeEntrada: "2024-01-01T08:00:00Z",
              fichajeSalida: "2024-01-01T16:00:00Z",
              estado: EstadoPresencia.COMPLETO,
              trabajador: {
                nombre: "Juan",
                apellido1: "Pérez",
                puesto: "Conductor",
              },
            },
          ],
          meta: {
            total: 1,
            totalPages: 1,
          },
        },
      });
    });

    render(<UnmatchedResultsTable sessionId={sessionId} />);

    await waitFor(() => {
      const statusElement = screen.getByText(EstadoPresencia.COMPLETO);
      expect(statusElement).toHaveClass("bg-green-100");
    });
  });

  it("debe mostrar estado INCOMPLETO con badge amarillo", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes("/stats"))
        return Promise.resolve({ data: { byStatus: {}, byPuesto: {} } });
      return Promise.resolve({
        data: {
          data: [
            {
              id: 1,
              fecha: "2024-01-01",
              fichajeEntrada: "2024-01-01T08:00:00Z",
              fichajeSalida: null,
              estado: EstadoPresencia.INCOMPLETO,
              trabajador: {
                nombre: "María",
                apellido1: "López",
                puesto: "Operaria",
              },
            },
          ],
          meta: {
            total: 1,
            totalPages: 1,
          },
        },
      });
    });

    render(<UnmatchedResultsTable sessionId={sessionId} />);

    await waitFor(() => {
      const statusElement = screen.getByText(EstadoPresencia.INCOMPLETO);
      expect(statusElement).toHaveClass("bg-yellow-100");
    });
  });

  it("debe mostrar estado SIN_PRESENCIA con badge rojo", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes("/stats"))
        return Promise.resolve({ data: { byStatus: {}, byPuesto: {} } });
      return Promise.resolve({
        data: {
          data: [
            {
              id: 1,
              fecha: "2024-01-01",
              fichajeEntrada: null,
              fichajeSalida: null,
              estado: EstadoPresencia.SIN_PRESENCIA,
              trabajador: {
                nombre: "Carlos",
                apellido1: "García",
                puesto: "Conductor",
              },
            },
          ],
          meta: {
            total: 1,
            totalPages: 1,
          },
        },
      });
    });

    render(<UnmatchedResultsTable sessionId={sessionId} />);

    await waitFor(() => {
      const statusElement = screen.getByText(EstadoPresencia.SIN_PRESENCIA);
      expect(statusElement).toHaveClass("bg-red-100");
    });
  });

  it("debe mostrar hora de entrada formateada correctamente", async () => {
    const inputDate = "2024-01-01T08:30:00Z";

    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes("/stats"))
        return Promise.resolve({ data: { byStatus: {}, byPuesto: {} } });
      return Promise.resolve({
        data: {
          data: [
            {
              id: 1,
              fecha: "2024-01-01",
              fichajeEntrada: inputDate,
              fichajeSalida: "2024-01-01T16:45:00Z",
              estado: EstadoPresencia.COMPLETO,
              trabajador: {
                nombre: "Juan",
                apellido1: "Pérez",
                puesto: "Conductor",
              },
            },
          ],
          meta: {
            total: 1,
            totalPages: 1,
          },
        },
      });
    });

    render(<UnmatchedResultsTable sessionId={sessionId} />);

    const expectedTime = new Date(inputDate).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    await waitFor(() => {
      expect(screen.getByText(expectedTime)).toBeInTheDocument();
    });
  });

  it("debe mostrar '-' cuando falta hora de entrada o salida", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes("/stats"))
        return Promise.resolve({ data: { byStatus: {}, byPuesto: {} } });
      return Promise.resolve({
        data: {
          data: [
            {
              id: 1,
              fecha: "2024-01-01",
              fichajeEntrada: null,
              fichajeSalida: "2024-01-01T16:00:00Z",
              estado: EstadoPresencia.INCOMPLETO,
              trabajador: {
                nombre: "Juan",
                apellido1: "Pérez",
                puesto: "Conductor",
              },
            },
          ],
          meta: {
            total: 1,
            totalPages: 1,
          },
        },
      });
    });

    render(<UnmatchedResultsTable sessionId={sessionId} />);

    await waitFor(() => {
      const minusElements = screen.getAllByText("-");
      expect(minusElements.length).toBeGreaterThan(0);
    });
  });

  it("debe mostrar paginación con múltiples páginas", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes("/stats"))
        return Promise.resolve({ data: { byStatus: {}, byPuesto: {} } });
      return Promise.resolve({
        data: {
          data: Array(10)
            .fill(null)
            .map((_, i) => ({
              id: i + 1,
              fecha: "2024-01-01",
              fichajeEntrada: "2024-01-01T08:00:00Z",
              fichajeSalida: "2024-01-01T16:00:00Z",
              estado: EstadoPresencia.COMPLETO,
              trabajador: {
                nombre: `Worker${i + 1}`,
                apellido1: "Last",
                puesto: "Conductor",
              },
            })),
          meta: {
            total: 25,
            totalPages: 3,
          },
        },
      });
    });

    render(<UnmatchedResultsTable sessionId={sessionId} />);

    await waitFor(() => {
      // Verify table is rendered
      expect(screen.getByText("Fecha")).toBeInTheDocument();
    });
  });

  it("debe mostrar nombres de trabajadores sin apellido2", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes("/stats"))
        return Promise.resolve({ data: { byStatus: {}, byPuesto: {} } });
      return Promise.resolve({
        data: {
          data: [
            {
              id: 1,
              fecha: "2024-01-01",
              fichajeEntrada: "2024-01-01T08:00:00Z",
              fichajeSalida: "2024-01-01T16:00:00Z",
              estado: EstadoPresencia.COMPLETO,
              trabajador: {
                nombre: "Ana",
                apellido1: "García",
                puesto: "Operaria",
              },
            },
          ],
          meta: {
            total: 1,
            totalPages: 1,
          },
        },
      });
    });

    render(<UnmatchedResultsTable sessionId={sessionId} />);

    await waitFor(() => {
      expect(screen.getByText("Ana García")).toBeInTheDocument();
    });
  });

  it("debe renderizar encabezados de tabla correctamente", async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes("/stats"))
        return Promise.resolve({ data: { byStatus: {}, byPuesto: {} } });
      return Promise.resolve({
        data: {
          data: [],
          meta: {
            total: 0,
            totalPages: 0,
          },
        },
      });
    });

    render(<UnmatchedResultsTable sessionId={sessionId} />);

    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Trabajador")).toBeInTheDocument();
    expect(screen.getByText("Puesto")).toBeInTheDocument();
    expect(screen.getByText("Entrada")).toBeInTheDocument();
    expect(screen.getByText("Salida")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();
  });
});
