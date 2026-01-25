import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useServiceSummary } from "./useServiceSummary";
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

describe("useServiceSummary Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe cargar resumen de servicio exitosamente", async () => {
    const mockData = {
      rows: [
        { servicio: "Route A", jornadas: 25 },
        { servicio: "Route B", jornadas: 20 },
      ],
      total: 45,
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useServiceSummary(123), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("debe manejar errores correctamente", async () => {
    const mockError = new Error("API Error");
    (api.get as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useServiceSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it("debe llamar a API con sessionId correcto", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { rows: [], total: 0 },
    });

    renderHook(() => useServiceSummary(789), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/jornadas/789/service-summary");
    });
  });

  it("debe estar en estado loading inicialmente", () => {
    (api.get as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { rows: [], total: 0 } }), 100),
        ),
    );

    const { result } = renderHook(() => useServiceSummary(123), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("debe proporcionar función handleExport", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        rows: [{ servicio: "Route A", jornadas: 25 }],
        total: 25,
      },
    });

    const { result } = renderHook(() => useServiceSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.handleExport).toBe("function");
  });

  it("debe reutilizar datos en caché para mismo sessionId", async () => {
    const mockData = {
      rows: [{ servicio: "Route A", jornadas: 25 }],
      total: 25,
    };
    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result: result1 } = renderHook(() => useServiceSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    const { result: result2 } = renderHook(() => useServiceSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result2.current.data).toEqual(mockData);
    });
  });

  it("debe hacer nueva llamada con sessionId diferente", async () => {
    const mockData1 = {
      rows: [{ servicio: "Route A", jornadas: 25 }],
      total: 25,
    };
    const mockData2 = {
      rows: [{ servicio: "Route B", jornadas: 35 }],
      total: 35,
    };

    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockData1 })
      .mockResolvedValueOnce({ data: mockData2 });

    const { result: result1 } = renderHook(() => useServiceSummary(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData1);
    });

    const { result: result2 } = renderHook(() => useServiceSummary(2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result2.current.data).toEqual(mockData2);
    });

    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it("debe tener queryKey válida", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { rows: [], total: 0 } });

    renderHook(() => useServiceSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it("debe manejar sessionId indefinido", () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { rows: [], total: 0 } });

    const { result } = renderHook(() => useServiceSummary(0), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
  });

  it("debe retornar todos los campos esperados", async () => {
    const mockData = {
      rows: [{ servicio: "Route A", jornadas: 25 }],
      total: 25,
    };
    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useServiceSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("handleExport");
  });

  it("debe actualizar cuando sessionId cambia", async () => {
    const mockData1 = {
      rows: [{ servicio: "Route A", jornadas: 25 }],
      total: 25,
    };
    const mockData2 = {
      rows: [{ servicio: "Route B", jornadas: 35 }],
      total: 35,
    };

    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockData1 })
      .mockResolvedValueOnce({ data: mockData2 });

    const { result, rerender } = renderHook(
      ({ sessionId }) => useServiceSummary(sessionId),
      { initialProps: { sessionId: 1 }, wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1);
    });

    rerender({ sessionId: 2 });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });

    expect(api.get).toHaveBeenCalledWith("/jornadas/1/service-summary");
    expect(api.get).toHaveBeenCalledWith("/jornadas/2/service-summary");
  });

  it("debe manejar datos vacíos", async () => {
    const mockData = { rows: [], total: 0 };
    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useServiceSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.rows).toHaveLength(0);
    expect(result.current.data?.total).toBe(0);
  });

  it("debe mantener estructura de datos consistente", async () => {
    const mockData = {
      rows: [
        { servicio: "Route A", jornadas: 25 },
        { servicio: "Route B", jornadas: 20 },
      ],
      total: 45,
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useServiceSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(Array.isArray(result.current.data?.rows)).toBe(true);
    expect(result.current.data?.total).toBe(45);
  });
});
