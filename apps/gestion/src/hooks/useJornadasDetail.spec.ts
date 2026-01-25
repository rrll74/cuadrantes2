import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useJornadasDetail } from "./useJornadasDetail";
import api from "@/lib/api";
import React from "react";

jest.mock("@/lib/api");

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = "QueryClientWrapper";
  return Wrapper;
};

describe("useJornadasDetail Hook", () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockApiCall: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiCall = jest.fn();
    (api.get as jest.Mock).mockClear();
  });

  it("debe cargar detalles de jornadas exitosamente", async () => {
    const mockData = {
      sessionId: 123,
      date: "2024-01-01",
      totalWorkers: 50,
      details: [{ workerId: 1, name: "Worker 1", status: "present" }],
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useJornadasDetail(123), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("debe manejar errores de API", async () => {
    const mockError = new Error("Failed to fetch jornadas detail");
    (api.get as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useJornadasDetail(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it("debe llamar API con sessionId correcto", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        sessionId: 456,
        date: "2024-01-02",
        totalWorkers: 30,
        details: [],
      },
    });

    renderHook(() => useJornadasDetail(456), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/jornadas/456/table-detail");
    });
  });

  it("debe estar en estado loading inicialmente", () => {
    (api.get as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: {
                  sessionId: 123,
                  date: "2024-01-01",
                  totalWorkers: 50,
                  details: [],
                },
              }),
            100,
          ),
        ),
    );

    const { result } = renderHook(() => useJornadasDetail(123), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("debe retornar todos los campos esperados", async () => {
    const mockData = {
      sessionId: 123,
      date: "2024-01-01",
      totalWorkers: 50,
      details: [],
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useJornadasDetail(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
  });

  it("debe actualizar cuando sessionId cambia", async () => {
    const mockData1 = {
      sessionId: 1,
      date: "2024-01-01",
      totalWorkers: 50,
      details: [],
    };
    const mockData2 = {
      sessionId: 2,
      date: "2024-01-02",
      totalWorkers: 40,
      details: [],
    };

    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockData1 })
      .mockResolvedValueOnce({ data: mockData2 });

    const { result, rerender } = renderHook(
      ({ sessionId }) => useJornadasDetail(sessionId),
      { initialProps: { sessionId: 1 }, wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1);
    });

    rerender({ sessionId: 2 });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });

    expect(api.get).toHaveBeenCalledWith("/jornadas/1/table-detail");
    expect(api.get).toHaveBeenCalledWith("/jornadas/2/table-detail");
  });

  it("debe manejar datos con múltiples detalles", async () => {
    const mockData = {
      sessionId: 123,
      date: "2024-01-01",
      rows: [
        { workerId: 1, name: "Worker 1", status: "present" },
        { workerId: 2, name: "Worker 2", status: "absent" },
        { workerId: 3, name: "Worker 3", status: "present" },
      ],
      columns: [{ id: "col1", data: ["Header"] }],
      footer: { id: "footer", data: ["total"] },
      discountedRows: [{ workerId: 4, name: "Worker 4", status: "discounted" }],
      discountedFooter: { id: "discountedFooter", data: ["discounted total"] },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useJornadasDetail(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      console.log(result.current.data);
      expect(result.current.data).toEqual(mockData);
      expect(result.current.data?.rows).toHaveLength(3);
      expect(result.current.data?.columns).toBeDefined();
    });
  });

  it("debe tener queryKey válida", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        columns: [{ id: "col1", data: ["Header"] }],
        rows: [{ id: "row1", data: ["value"] }],
        footer: { id: "footer", data: ["total"] },
      },
    });

    renderHook(() => useJornadasDetail(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it("debe manejar sessionId indefinido", () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        columns: [{ id: "col1", data: ["Header"] }],
        rows: [{ id: "row1", data: ["value"] }],
        footer: { id: "footer", data: ["total"] },
      },
    });

    const { result } = renderHook(() => useJornadasDetail(0), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
  });

  it("debe reutilizar datos en caché para mismo sessionId", async () => {
    const mockData = {
      sessionId: 123,
      date: "2024-01-01",
      totalWorkers: 50,
      details: [],
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    // Usar el mismo QueryClient para ambos hooks
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );

    const { result: result1 } = renderHook(() => useJornadasDetail(123), {
      wrapper,
    });

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData);
    });

    // Segunda llamada con el mismo sessionId y mismo QueryClient
    const { result: result2 } = renderHook(() => useJornadasDetail(123), {
      wrapper,
    });

    // Debería usar datos en caché, así que data está disponible inmediatamente
    expect(result2.current.data).toEqual(mockData);
  });

  it("debe hacer nueva llamada con sessionId diferente", async () => {
    const mockData1 = {
      sessionId: 1,
      date: "2024-01-01",
      totalWorkers: 50,
      details: [],
    };
    const mockData2 = {
      sessionId: 2,
      date: "2024-01-02",
      totalWorkers: 40,
      details: [],
    };

    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockData1 })
      .mockResolvedValueOnce({ data: mockData2 });

    const { result: result1 } = renderHook(() => useJornadasDetail(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData1);
    });

    const { result: result2 } = renderHook(() => useJornadasDetail(2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result2.current.data).toEqual(mockData2);
    });

    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it("debe manejar lista de detalles vacía", async () => {
    const mockData = {
      sessionId: 123,
      date: "2024-01-01",
      totalWorkers: 0,
      rows: [],
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useJornadasDetail(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.rows).toHaveLength(0);
  });

  it("debe mantener estructura de datos consistente", async () => {
    const mockData = {
      sessionId: 123,
      date: "2024-01-01",
      totalWorkers: 1,
      details: [{ workerId: 1, name: "Test", status: "present" }],
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useJornadasDetail(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data).toMatchObject({
      sessionId: expect.any(Number),
      date: expect.any(String),
      totalWorkers: expect.any(Number),
      details: expect.any(Array),
    });
  });
});
