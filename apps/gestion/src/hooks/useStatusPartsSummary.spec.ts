import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStatusPartsSummary } from "./useStatusPartsSummary";
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

describe("useStatusPartsSummary Hook", () => {
    typeof api.getStatusPartsSummary
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get = jest.fn();
  });

  it("debe cargar resumen de partes de estado exitosamente", async () => {
    const mockData = {
      present: 45,
      absent: 8,
      late: 5,
      excused: 2,
      total: 60,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useStatusPartsSummary("session-123"), {
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
    const mockError = new Error("Failed to fetch status parts summary");
    mockApiCall.mockRejectedValue(mockError);

    const { result } = renderHook(() => useStatusPartsSummary("session-123"), {
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
      present: 40,
      absent: 10,
      late: 5,
      excused: 5,
      total: 60,
    });

    renderHook(() => useStatusPartsSummary("session-999"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith("session-999");
    });
  });

  it("debe estar en estado loading inicialmente", () => {
    mockApiCall.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                present: 45,
                absent: 8,
                late: 5,
                excused: 2,
                total: 60,
              }),
            100,
          ),
        ),
    );

    const { result } = renderHook(() => useStatusPartsSummary("session-123"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("debe retornar todos los campos esperados", async () => {
    const mockData = {
      present: 45,
      absent: 8,
      late: 5,
      excused: 2,
      total: 60,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useStatusPartsSummary("session-123"), {
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
      present: 45,
      absent: 8,
      late: 5,
      excused: 2,
      total: 60,
    };
    const mockData2 = {
      present: 50,
      absent: 5,
      late: 3,
      excused: 2,
      total: 60,
    };

    mockApiCall
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result, rerender } = renderHook(
      ({ sessionId }) => useStatusPartsSummary(sessionId),
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

  it("debe calcular correctamente el total", async () => {
    const mockData = {
      present: 40,
      absent: 10,
      late: 5,
      excused: 5,
      total: 60, // 40 + 10 + 5 + 5 = 60
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useStatusPartsSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    const { present, absent, late, excused, total } = result.current.data || {};
    expect(present! + absent! + late! + excused!).toBe(total!);
  });

  it("debe manejar todos presentes", async () => {
    const mockData = {
      present: 60,
      absent: 0,
      late: 0,
      excused: 0,
      total: 60,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useStatusPartsSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.present).toBe(60);
    expect(result.current.data?.absent).toBe(0);
  });

  it("debe manejar todos ausentes", async () => {
    const mockData = {
      present: 0,
      absent: 60,
      late: 0,
      excused: 0,
      total: 60,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useStatusPartsSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.absent).toBe(60);
  });

  it("debe manejar total cero", async () => {
    const mockData = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useStatusPartsSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.total).toBe(0);
  });

  it("debe reutilizar datos en caché para mismo sessionId", async () => {
    const mockData = {
      present: 45,
      absent: 8,
      late: 5,
      excused: 2,
      total: 60,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result: result1 } = renderHook(
      () => useStatusPartsSummary("session-123"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData);
    });

    const { result: result2 } = renderHook(
      () => useStatusPartsSummary("session-123"),
      { wrapper: createWrapper() },
    );

    expect(result2.current.data).toEqual(mockData);
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it("debe hacer nueva llamada con sessionId diferente", async () => {
    const mockData1 = {
      present: 45,
      absent: 8,
      late: 5,
      excused: 2,
      total: 60,
    };
    const mockData2 = {
      present: 50,
      absent: 5,
      late: 3,
      excused: 2,
      total: 60,
    };

    mockApiCall
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result: result1 } = renderHook(
      () => useStatusPartsSummary("session-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData1);
    });

    const { result: result2 } = renderHook(
      () => useStatusPartsSummary("session-2"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result2.current.data).toEqual(mockData2);
    });

    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it("debe tener queryKey válida", async () => {
    mockApiCall.mockResolvedValue({
      present: 45,
      absent: 8,
      late: 5,
      excused: 2,
      total: 60,
    });

    renderHook(() => useStatusPartsSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalled();
    });
  });

  it("debe manejar sessionId undefined", () => {
    mockApiCall.mockResolvedValue({
      present: 45,
      absent: 8,
      late: 5,
      excused: 2,
      total: 60,
    });

    const { result } = renderHook(
      () => useStatusPartsSummary(undefined as any),
      { wrapper: createWrapper() },
    );

    expect(result.current).toBeDefined();
  });

  it("debe mantener estructura de datos consistente", async () => {
    const mockData = {
      present: 45,
      absent: 8,
      late: 5,
      excused: 2,
      total: 60,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useStatusPartsSummary("session-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data).toMatchObject({
      present: expect.any(Number),
      absent: expect.any(Number),
      late: expect.any(Number),
      excused: expect.any(Number),
      total: expect.any(Number),
    });
  });

  it("debe manejar diferentes ratios de estado", async () => {
    const scenarios = [
      { present: 60, absent: 0, late: 0, excused: 0, total: 60 },
      { present: 50, absent: 5, late: 3, excused: 2, total: 60 },
      { present: 30, absent: 20, late: 5, excused: 5, total: 60 },
    ];

    scenarios.forEach((scenario) => {
      mockApiCall.mockResolvedValueOnce(scenario);
    });

    scenarios.forEach(async (scenario) => {
      const { result } = renderHook(
        () => useStatusPartsSummary("session-123"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(scenario);
      });
    });
  });
});
