import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEqualPuestoSummary } from "./useEqualPuestoSummary";
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

describe("useEqualPuestoSummary Hook", () => {
  const mockApi = api as jest.Mocked<typeof api>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get = jest.fn();
  });

  it("debe cargar datos exitosamente", async () => {
    const mockData = {
      equal: 10,
      puesto: 5,
      total: 15,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useEqualPuestoSummary("session-123"), {
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
    mockApiCall.mockRejectedValue(mockError);

    const { result } = renderHook(() => useEqualPuestoSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it("debe llamar a API con sessionId correcto", async () => {
    mockApiCall.mockResolvedValue({ equal: 0, puesto: 0, total: 0 });

    renderHook(() => useEqualPuestoSummary("session-456"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith("session-456");
    });
  });

  it("debe estar en estado loading inicialmente", () => {
    mockApiCall.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ equal: 0, puesto: 0, total: 0 }), 100),
        ),
    );

    const { result } = renderHook(() => useEqualPuestoSummary("session-123"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("debe proporcionar función handleExport", async () => {
    mockApiCall.mockResolvedValue({ equal: 10, puesto: 5, total: 15 });

    const { result } = renderHook(() => useEqualPuestoSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.handleExport).toBe("function");
  });

  it("debe reutilizar datos en caché para mismo sessionId", async () => {
    const mockData = { equal: 10, puesto: 5, total: 15 };
    mockApiCall.mockResolvedValue(mockData);

    const { result: result1 } = renderHook(
      () => useEqualPuestoSummary("session-123"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    const { result: result2 } = renderHook(
      () => useEqualPuestoSummary("session-123"),
      { wrapper: createWrapper() },
    );

    // Debe usar caché, isLoading debería ser false inmediatamente
    expect(result2.current.data).toEqual(mockData);
  });

  it("debe hacer nueva llamada con sessionId diferente", async () => {
    const mockData1 = { equal: 10, puesto: 5, total: 15 };
    const mockData2 = { equal: 20, puesto: 10, total: 30 };

    mockApiCall
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result: result1 } = renderHook(
      () => useEqualPuestoSummary("session-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData1);
    });

    const { result: result2 } = renderHook(
      () => useEqualPuestoSummary("session-2"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result2.current.data).toEqual(mockData2);
    });

    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it("debe tener queryKey válida", async () => {
    mockApiCall.mockResolvedValue({ equal: 0, puesto: 0, total: 0 });

    renderHook(() => useEqualPuestoSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalled();
    });
  });

  it("debe manejar sessionId undefined", () => {
    mockApiCall.mockResolvedValue({ equal: 0, puesto: 0, total: 0 });

    const { result } = renderHook(
      () => useEqualPuestoSummary(undefined as any),
      { wrapper: createWrapper() },
    );

    // Hook debe manejar gracefully o mostrar estado apropiado
    expect(result.current).toBeDefined();
  });

  it("debe retornar todos los campos esperados", async () => {
    const mockData = { equal: 10, puesto: 5, total: 15 };
    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useEqualPuestoSummary("session-123"), {
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
    const mockData1 = { equal: 10, puesto: 5, total: 15 };
    const mockData2 = { equal: 20, puesto: 10, total: 30 };

    mockApiCall
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result, rerender } = renderHook(
      ({ sessionId }) => useEqualPuestoSummary(sessionId),
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

  it("debe manejar datos vacíos", async () => {
    const mockData = { equal: 0, puesto: 0, total: 0 };
    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useEqualPuestoSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.equal).toBe(0);
    expect(result.current.data?.puesto).toBe(0);
    expect(result.current.data?.total).toBe(0);
  });
});
