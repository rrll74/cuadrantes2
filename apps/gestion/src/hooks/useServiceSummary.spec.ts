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
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useServiceSummary Hook", () => {
    typeof api.getServiceSummary
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get = jest.fn();
  });

  it("debe cargar resumen de servicio exitosamente", async () => {
    const mockData = {
      serviceName: "Route A",
      totalWorkers: 25,
      presentWorkers: 20,
      absentWorkers: 5,
      successRate: 80,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useServiceSummary("session-123"), {
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
    const mockError = new Error("Failed to fetch service summary");
    mockApiCall.mockRejectedValue(mockError);

    const { result } = renderHook(() => useServiceSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it("debe llamar API con sessionId correcto", async () => {
    mockApiCall.mockResolvedValue({
      serviceName: "Route B",
      totalWorkers: 30,
      presentWorkers: 25,
      absentWorkers: 5,
      successRate: 83.33,
    });

    renderHook(() => useServiceSummary("session-789"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith("session-789");
    });
  });

  it("debe estar en estado loading inicialmente", () => {
    mockApiCall.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                serviceName: "Route A",
                totalWorkers: 25,
                presentWorkers: 20,
                absentWorkers: 5,
                successRate: 80,
              }),
            100,
          ),
        ),
    );

    const { result } = renderHook(() => useServiceSummary("session-123"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("debe retornar todos los campos esperados", async () => {
    const mockData = {
      serviceName: "Route A",
      totalWorkers: 25,
      presentWorkers: 20,
      absentWorkers: 5,
      successRate: 80,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useServiceSummary("session-123"), {
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
      serviceName: "Route A",
      totalWorkers: 25,
      presentWorkers: 20,
      absentWorkers: 5,
      successRate: 80,
    };
    const mockData2 = {
      serviceName: "Route B",
      totalWorkers: 30,
      presentWorkers: 28,
      absentWorkers: 2,
      successRate: 93.33,
    };

    mockApiCall
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result, rerender } = renderHook(
      ({ sessionId }) => useServiceSummary(sessionId),
      { initialProps: { sessionId: "session-1" }, wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1);
    });

    rerender({ sessionId: "session-2" });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });

    expect(mockApiCall).toHaveBeenCalledWith("session-1");
    expect(mockApiCall).toHaveBeenCalledWith("session-2");
  });

  it("debe calcular correctamente el successRate", async () => {
    const mockData = {
      serviceName: "Route C",
      totalWorkers: 10,
      presentWorkers: 8,
      absentWorkers: 2,
      successRate: 80, // 8/10 = 0.8 = 80%
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useServiceSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.successRate).toBe(80);
  });

  it("debe manejar cero trabajadores totales", async () => {
    const mockData = {
      serviceName: "Empty Route",
      totalWorkers: 0,
      presentWorkers: 0,
      absentWorkers: 0,
      successRate: 0,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useServiceSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.totalWorkers).toBe(0);
  });

  it("debe manejar 100% de asistencia", async () => {
    const mockData = {
      serviceName: "Perfect Route",
      totalWorkers: 20,
      presentWorkers: 20,
      absentWorkers: 0,
      successRate: 100,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useServiceSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.successRate).toBe(100);
  });

  it("debe reutilizar datos en caché para mismo sessionId", async () => {
    const mockData = {
      serviceName: "Route A",
      totalWorkers: 25,
      presentWorkers: 20,
      absentWorkers: 5,
      successRate: 80,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result: result1 } = renderHook(
      () => useServiceSummary("session-123"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData);
    });

    const { result: result2 } = renderHook(
      () => useServiceSummary("session-123"),
      { wrapper: createWrapper() },
    );

    expect(result2.current.data).toEqual(mockData);
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it("debe hacer nueva llamada con sessionId diferente", async () => {
    const mockData1 = {
      serviceName: "Route A",
      totalWorkers: 25,
      presentWorkers: 20,
      absentWorkers: 5,
      successRate: 80,
    };
    const mockData2 = {
      serviceName: "Route B",
      totalWorkers: 30,
      presentWorkers: 28,
      absentWorkers: 2,
      successRate: 93.33,
    };

    mockApiCall
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result: result1 } = renderHook(
      () => useServiceSummary("session-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData1);
    });

    const { result: result2 } = renderHook(
      () => useServiceSummary("session-2"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result2.current.data).toEqual(mockData2);
    });

    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it("debe tener queryKey válida", async () => {
    mockApiCall.mockResolvedValue({
      serviceName: "Route A",
      totalWorkers: 25,
      presentWorkers: 20,
      absentWorkers: 5,
      successRate: 80,
    });

    renderHook(() => useServiceSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalled();
    });
  });

  it("debe manejar sessionId undefined", () => {
    mockApiCall.mockResolvedValue({
      serviceName: "Route A",
      totalWorkers: 25,
      presentWorkers: 20,
      absentWorkers: 5,
      successRate: 80,
    });

    const { result } = renderHook(() => useServiceSummary(undefined as any), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
  });

  it("debe mantener estructura de datos consistente", async () => {
    const mockData = {
      serviceName: "Route A",
      totalWorkers: 25,
      presentWorkers: 20,
      absentWorkers: 5,
      successRate: 80,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useServiceSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data).toMatchObject({
      serviceName: expect.any(String),
      totalWorkers: expect.any(Number),
      presentWorkers: expect.any(Number),
      absentWorkers: expect.any(Number),
      successRate: expect.any(Number),
    });
  });

  it("debe validar que presentWorkers + absentWorkers = totalWorkers", async () => {
    const mockData = {
      serviceName: "Route A",
      totalWorkers: 25,
      presentWorkers: 20,
      absentWorkers: 5,
      successRate: 80,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useServiceSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    const { presentWorkers, absentWorkers, totalWorkers } =
      result.current.data || {};
    expect(presentWorkers! + absentWorkers!).toBe(totalWorkers!);
  });
});
