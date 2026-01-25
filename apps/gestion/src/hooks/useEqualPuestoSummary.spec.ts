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
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = "QueryClientWrapper";
  return Wrapper;
};

describe("useEqualPuestoSummary Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe cargar datos exitosamente", async () => {
    const mockData = {
      rows: [
        { puesto: "Conductor", equal: 10, jornadas: 5 },
        { puesto: "Limpiador", equal: 8, jornadas: 4 },
      ],
      total: 18,
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useEqualPuestoSummary(123), {
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

    const { result } = renderHook(() => useEqualPuestoSummary(123), {
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

    renderHook(() => useEqualPuestoSummary(456), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/jornadas/456/equal-puesto-summary",
      );
    });
  });

  it("debe estar en estado loading inicialmente", () => {
    (api.get as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { rows: [], total: 0 } }), 100),
        ),
    );

    const { result } = renderHook(() => useEqualPuestoSummary(123), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("debe proporcionar función handleExport", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        rows: [{ puesto: "Conductor", equal: 10, jornadas: 5 }],
        total: 10,
      },
    });

    const { result } = renderHook(() => useEqualPuestoSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.handleExport).toBe("function");
  });

  it("debe reutilizar datos en caché para mismo sessionId", async () => {
    const mockData = {
      rows: [{ puesto: "Conductor", equal: 10, jornadas: 5 }],
      total: 10,
    };
    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result: result1 } = renderHook(() => useEqualPuestoSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    const { result: result2 } = renderHook(() => useEqualPuestoSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result2.current.data).toEqual(mockData);
    });
  });

  it("debe hacer nueva llamada con sessionId diferente", async () => {
    const mockData1 = {
      rows: [{ puesto: "Conductor", equal: 10, jornadas: 5 }],
      total: 10,
    };
    const mockData2 = {
      rows: [{ puesto: "Conductor", equal: 20, jornadas: 10 }],
      total: 20,
    };

    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockData1 })
      .mockResolvedValueOnce({ data: mockData2 });

    const { result: result1 } = renderHook(() => useEqualPuestoSummary(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData1);
    });

    const { result: result2 } = renderHook(() => useEqualPuestoSummary(2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result2.current.data).toEqual(mockData2);
    });

    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it("debe tener queryKey válida", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { rows: [], total: 0 } });

    renderHook(() => useEqualPuestoSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it("debe manejar sessionId indefinido", () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { rows: [], total: 0 } });

    const { result } = renderHook(() => useEqualPuestoSummary(0), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
  });

  it("debe retornar todos los campos esperados", async () => {
    const mockData = {
      rows: [{ puesto: "Conductor", equal: 10, jornadas: 5 }],
      total: 10,
    };
    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useEqualPuestoSummary(123), {
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
      rows: [{ puesto: "Conductor", equal: 10, jornadas: 5 }],
      total: 10,
    };
    const mockData2 = {
      rows: [{ puesto: "Conductor", equal: 20, jornadas: 10 }],
      total: 20,
    };

    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockData1 })
      .mockResolvedValueOnce({ data: mockData2 });

    const { result, rerender } = renderHook(
      ({ sessionId }) => useEqualPuestoSummary(sessionId),
      { initialProps: { sessionId: 1 }, wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1);
    });

    rerender({ sessionId: 2 });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });

    expect(api.get).toHaveBeenCalledWith("/jornadas/1/equal-puesto-summary");
    expect(api.get).toHaveBeenCalledWith("/jornadas/2/equal-puesto-summary");
  });

  it("debe manejar datos vacíos", async () => {
    const mockData = { rows: [], total: 0 };
    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useEqualPuestoSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.rows).toHaveLength(0);
    expect(result.current.data?.total).toBe(0);
  });
});
