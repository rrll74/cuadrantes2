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
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useJornadasDetail Hook", () => {
    typeof api.getJornadasDetail
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get = jest.fn();
  });

  it("debe cargar detalles de jornadas exitosamente", async () => {
    const mockData = {
      sessionId: "session-123",
      date: "2024-01-01",
      totalWorkers: 50,
      details: [{ workerId: 1, name: "Worker 1", status: "present" }],
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useJornadasDetail("session-123"), {
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
    mockApiCall.mockRejectedValue(mockError);

    const { result } = renderHook(() => useJornadasDetail("session-123"), {
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
      sessionId: "session-456",
      date: "2024-01-02",
      totalWorkers: 30,
      details: [],
    });

    renderHook(() => useJornadasDetail("session-456"), {
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
          setTimeout(
            () =>
              resolve({
                sessionId: "session-123",
                date: "2024-01-01",
                totalWorkers: 50,
                details: [],
              }),
            100,
          ),
        ),
    );

    const { result } = renderHook(() => useJornadasDetail("session-123"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("debe retornar todos los campos esperados", async () => {
    const mockData = {
      sessionId: "session-123",
      date: "2024-01-01",
      totalWorkers: 50,
      details: [],
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useJornadasDetail("session-123"), {
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
      sessionId: "session-1",
      date: "2024-01-01",
      totalWorkers: 50,
      details: [],
    };
    const mockData2 = {
      sessionId: "session-2",
      date: "2024-01-02",
      totalWorkers: 40,
      details: [],
    };

    mockApiCall
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result, rerender } = renderHook(
      ({ sessionId }) => useJornadasDetail(sessionId),
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

  it("debe manejar datos con múltiples detalles", async () => {
    const mockData = {
      sessionId: "session-123",
      date: "2024-01-01",
      totalWorkers: 3,
      details: [
        { workerId: 1, name: "Worker 1", status: "present" },
        { workerId: 2, name: "Worker 2", status: "absent" },
        { workerId: 3, name: "Worker 3", status: "present" },
      ],
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useJornadasDetail("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.details).toHaveLength(3);
    expect(result.current.data?.totalWorkers).toBe(3);
  });

  it("debe tener queryKey válida", async () => {
    mockApiCall.mockResolvedValue({
      sessionId: "session-123",
      date: "2024-01-01",
      totalWorkers: 50,
      details: [],
    });

    renderHook(() => useJornadasDetail("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalled();
    });
  });

  it("debe manejar sessionId undefined", () => {
    mockApiCall.mockResolvedValue({
      sessionId: "session-123",
      date: "2024-01-01",
      totalWorkers: 50,
      details: [],
    });

    const { result } = renderHook(() => useJornadasDetail(undefined as any), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
  });

  it("debe reutilizar datos en caché para mismo sessionId", async () => {
    const mockData = {
      sessionId: "session-123",
      date: "2024-01-01",
      totalWorkers: 50,
      details: [],
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result: result1 } = renderHook(
      () => useJornadasDetail("session-123"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData);
    });

    const { result: result2 } = renderHook(
      () => useJornadasDetail("session-123"),
      { wrapper: createWrapper() },
    );

    expect(result2.current.data).toEqual(mockData);
  });

  it("debe hacer nueva llamada con sessionId diferente", async () => {
    const mockData1 = {
      sessionId: "session-1",
      date: "2024-01-01",
      totalWorkers: 50,
      details: [],
    };
    const mockData2 = {
      sessionId: "session-2",
      date: "2024-01-02",
      totalWorkers: 40,
      details: [],
    };

    mockApiCall
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result: result1 } = renderHook(
      () => useJornadasDetail("session-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData1);
    });

    const { result: result2 } = renderHook(
      () => useJornadasDetail("session-2"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result2.current.data).toEqual(mockData2);
    });

    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it("debe manejar lista de detalles vacía", async () => {
    const mockData = {
      sessionId: "session-123",
      date: "2024-01-01",
      totalWorkers: 0,
      details: [],
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useJornadasDetail("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.details).toHaveLength(0);
  });

  it("debe mantener estructura de datos consistente", async () => {
    const mockData = {
      sessionId: "session-123",
      date: "2024-01-01",
      totalWorkers: 1,
      details: [{ workerId: 1, name: "Test", status: "present" }],
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useJornadasDetail("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data).toMatchObject({
      sessionId: expect.any(String),
      date: expect.any(String),
      totalWorkers: expect.any(Number),
      details: expect.any(Array),
    });
  });
});
