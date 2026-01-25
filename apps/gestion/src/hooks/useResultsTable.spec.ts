import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useResultsTable } from "./useResultsTable";
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

describe("useResultsTable Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe cargar datos de tabla de resultados exitosamente", async () => {
    const mockData = {
      data: [
        { id: 1, nombre: "Worker 1", status: "completo", isDiscounted: false },
        {
          id: 2,
          nombre: "Worker 2",
          status: "incompleto",
          isDiscounted: false,
        },
      ],
      meta: {
        total: 2,
        totalPages: 1,
        currentPage: 1,
        limit: 10,
      },
      stats: {
        total: 2,
        completo: 1,
        incompleto: 1,
        sinPresencia: 0,
        revisar: 0,
      },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useResultsTable(123), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData.data);
    expect(result.current.stats).toEqual(mockData.stats);
  });

  it("debe manejar errores de API", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    const mockError = new Error("Failed to fetch results");
    (api.get as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useResultsTable(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result.current.data).toEqual([]);

    consoleErrorSpy.mockRestore();
  });

  it("debe llamar API con parámetros correctos", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: [],
        meta: { total: 0, totalPages: 0, currentPage: 1, limit: 10 },
        stats: {
          total: 0,
          completo: 0,
          incompleto: 0,
          sinPresencia: 0,
          revisar: 0,
        },
      },
    });

    renderHook(() => useResultsTable(456), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/jornadas/456?page=1&limit=10&search=&status=&discounted=",
      );
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
                  data: [],
                  meta: { total: 0, totalPages: 0, currentPage: 1, limit: 10 },
                  stats: {
                    total: 0,
                    completo: 0,
                    incompleto: 0,
                    sinPresencia: 0,
                    revisar: 0,
                  },
                },
              }),
            100,
          ),
        ),
    );

    const { result } = renderHook(() => useResultsTable(123), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);
  });

  it("debe actualizar cuando página cambia", async () => {
    const mockData1 = {
      data: [
        { id: 1, nombre: "Worker 1", status: "completo", isDiscounted: false },
      ],
      meta: { total: 20, totalPages: 2, currentPage: 1, limit: 10 },
      stats: {
        total: 20,
        completo: 10,
        incompleto: 5,
        sinPresencia: 3,
        revisar: 2,
      },
    };
    const mockData2 = {
      data: [
        {
          id: 11,
          nombre: "Worker 11",
          status: "completo",
          isDiscounted: false,
        },
      ],
      meta: { total: 20, totalPages: 2, currentPage: 2, limit: 10 },
      stats: {
        total: 20,
        completo: 10,
        incompleto: 5,
        sinPresencia: 3,
        revisar: 2,
      },
    };

    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockData1 })
      .mockResolvedValueOnce({ data: mockData2 });

    const { result } = renderHook(() => useResultsTable(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1.data);
    });

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2.data);
    });

    expect(api.get).toHaveBeenCalledWith(
      "/jornadas/123?page=1&limit=10&search=&status=&discounted=",
    );
    expect(api.get).toHaveBeenCalledWith(
      "/jornadas/123?page=2&limit=10&search=&status=&discounted=",
    );
  });

  it("debe actualizar cuando filtro cambia", async () => {
    const mockData1 = {
      data: [
        { id: 1, nombre: "Worker 1", status: "completo", isDiscounted: false },
      ],
      meta: { total: 20, totalPages: 2, currentPage: 1, limit: 10 },
      stats: {
        total: 20,
        completo: 10,
        incompleto: 5,
        sinPresencia: 3,
        revisar: 2,
      },
    };
    const mockData2 = {
      data: [
        { id: 1, nombre: "Worker 1", status: "completo", isDiscounted: false },
      ],
      meta: { total: 1, totalPages: 1, currentPage: 1, limit: 10 },
      stats: {
        total: 1,
        completo: 1,
        incompleto: 0,
        sinPresencia: 0,
        revisar: 0,
      },
    };

    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockData1 })
      .mockResolvedValueOnce({ data: mockData2 });

    const { result } = renderHook(() => useResultsTable(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1.data);
    });

    act(() => {
      result.current.setGlobalFilter("Worker 1");
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/jornadas/123?page=1&limit=10&search=Worker 1&status=&discounted=",
      );
    });
  });

  it("debe actualizar cuando sessionId cambia", async () => {
    const mockData1 = {
      data: [
        { id: 1, nombre: "Worker 1", status: "completo", isDiscounted: false },
      ],
      meta: { total: 10, totalPages: 1, currentPage: 1, limit: 10 },
      stats: {
        total: 10,
        completo: 5,
        incompleto: 3,
        sinPresencia: 1,
        revisar: 1,
      },
    };
    const mockData2 = {
      data: [
        { id: 1, nombre: "Worker 1", status: "completo", isDiscounted: false },
      ],
      meta: { total: 20, totalPages: 2, currentPage: 1, limit: 10 },
      stats: {
        total: 20,
        completo: 10,
        incompleto: 5,
        sinPresencia: 3,
        revisar: 2,
      },
    };

    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockData1 })
      .mockResolvedValueOnce({ data: mockData2 });

    const { result, rerender } = renderHook(
      ({ sessionId }) => useResultsTable(sessionId),
      { initialProps: { sessionId: 1 }, wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.totalRecords).toBe(10);
    });

    rerender({ sessionId: 2 });

    await waitFor(() => {
      expect(result.current.totalRecords).toBe(20);
    });
  });

  it("debe retornar todos los campos esperados", async () => {
    const mockData = {
      data: [
        { id: 1, nombre: "Worker 1", status: "completo", isDiscounted: false },
      ],
      meta: { total: 10, totalPages: 1, currentPage: 1, limit: 10 },
      stats: {
        total: 10,
        completo: 5,
        incompleto: 3,
        sinPresencia: 1,
        revisar: 1,
      },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useResultsTable(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("stats");
    expect(result.current).toHaveProperty("page");
    expect(result.current).toHaveProperty("totalPages");
    expect(result.current).toHaveProperty("totalRecords");
    expect(result.current).toHaveProperty("setPage");
    expect(result.current).toHaveProperty("setGlobalFilter");
    expect(result.current).toHaveProperty("setStatusFilter");
    expect(result.current).toHaveProperty("setDiscountedFilter");
  });

  it("debe manejar lista de datos vacía", async () => {
    const mockData = {
      data: [],
      meta: { total: 0, totalPages: 0, currentPage: 1, limit: 10 },
      stats: {
        total: 0,
        completo: 0,
        incompleto: 0,
        sinPresencia: 0,
        revisar: 0,
      },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useResultsTable(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData.data);
    });

    expect(result.current.data).toHaveLength(0);
    expect(result.current.totalRecords).toBe(0);
  });

  it("debe manejar múltiples páginas", async () => {
    const results = [];
    for (let page = 1; page <= 3; page++) {
      results.push({
        data: [
          {
            id: (page - 1) * 10 + 1,
            nombre: `Worker ${(page - 1) * 10 + 1}`,
            status: "completo",
            isDiscounted: false,
          },
        ],
        meta: { total: 30, totalPages: 3, currentPage: page, limit: 10 },
        stats: {
          total: 30,
          completo: 15,
          incompleto: 10,
          sinPresencia: 3,
          revisar: 2,
        },
      });
    }

    results.forEach((data) => {
      (api.get as jest.Mock).mockResolvedValueOnce({ data });
    });

    const { result } = renderHook(() => useResultsTable(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.page).toBe(1);
    });

    for (let page = 2; page <= 3; page++) {
      act(() => {
        result.current.setPage(page);
      });

      await waitFor(() => {
        expect(result.current.page).toBe(page);
      });
    }
  });

  it("debe manejar búsqueda/filtro si se proporciona", async () => {
    const mockData = {
      data: [
        {
          id: 1,
          nombre: "Filtered Worker",
          status: "completo",
          isDiscounted: false,
        },
      ],
      meta: { total: 1, totalPages: 1, currentPage: 1, limit: 10 },
      stats: {
        total: 1,
        completo: 1,
        incompleto: 0,
        sinPresencia: 0,
        revisar: 0,
      },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useResultsTable(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setGlobalFilter("Filtered");
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining("search=Filtered"),
      );
    });
  });

  it("debe llamar API correctamente en cada renderizado", async () => {
    const mockData = {
      data: [
        { id: 1, nombre: "Worker 1", status: "completo", isDiscounted: false },
      ],
      meta: { total: 1, totalPages: 1, currentPage: 1, limit: 10 },
      stats: {
        total: 1,
        completo: 1,
        incompleto: 0,
        sinPresencia: 0,
        revisar: 0,
      },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useResultsTable(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData.data);
    });

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it("debe mantener estructura de datos consistente", async () => {
    const mockData = {
      data: [
        { id: 1, nombre: "Worker 1", status: "completo", isDiscounted: false },
        {
          id: 2,
          nombre: "Worker 2",
          status: "incompleto",
          isDiscounted: false,
        },
      ],
      meta: { total: 20, totalPages: 2, currentPage: 1, limit: 10 },
      stats: {
        total: 20,
        completo: 10,
        incompleto: 8,
        sinPresencia: 1,
        revisar: 1,
      },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useResultsTable(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData.data);
    });

    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.stats).toMatchObject({
      total: expect.any(Number),
      completo: expect.any(Number),
      incompleto: expect.any(Number),
      sinPresencia: expect.any(Number),
      revisar: expect.any(Number),
    });
  });
});
