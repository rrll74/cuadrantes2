import { renderHook, waitFor } from "@testing-library/react";
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
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useResultsTable Hook", () => {
    typeof api.getResultsTable
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get = jest.fn();
  });

  it("debe cargar datos de tabla de resultados exitosamente", async () => {
    const mockData = {
      data: [
        { id: 1, name: "Result 1", status: "matched" },
        { id: 2, name: "Result 2", status: "unmatched" },
      ],
      total: 2,
      page: 1,
      pageSize: 10,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useResultsTable("session-123", 1, 10), {
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
    const mockError = new Error("Failed to fetch results");
    mockApiCall.mockRejectedValue(mockError);

    const { result } = renderHook(() => useResultsTable("session-123", 1, 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it("debe llamar API con parámetros correctos", async () => {
    mockApiCall.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    renderHook(() => useResultsTable("session-456", 2, 20), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith("session-456", 2, 20);
    });
  });

  it("debe estar en estado loading inicialmente", () => {
    mockApiCall.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: [],
                total: 0,
                page: 1,
                pageSize: 10,
              }),
            100,
          ),
        ),
    );

    const { result } = renderHook(() => useResultsTable("session-123", 1, 10), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("debe actualizar cuando página cambia", async () => {
    const mockData1 = {
      data: [{ id: 1, name: "Result 1", status: "matched" }],
      total: 20,
      page: 1,
      pageSize: 10,
    };
    const mockData2 = {
      data: [{ id: 11, name: "Result 11", status: "matched" }],
      total: 20,
      page: 2,
      pageSize: 10,
    };

    mockApiCall
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result, rerender } = renderHook(
      ({ page }) => useResultsTable("session-123", page, 10),
      { initialProps: { page: 1 }, wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1);
    });

    rerender({ page: 2 });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });

    expect(mockApiCall).toHaveBeenCalledWith("session-123", 1, 10);
    expect(mockApiCall).toHaveBeenCalledWith("session-123", 2, 10);
  });

  it("debe actualizar cuando pageSize cambia", async () => {
    const mockData1 = {
      data: [{ id: 1, name: "Result 1", status: "matched" }],
      total: 20,
      page: 1,
      pageSize: 10,
    };
    const mockData2 = {
      data: [
        { id: 1, name: "Result 1", status: "matched" },
        { id: 2, name: "Result 2", status: "unmatched" },
      ],
      total: 20,
      page: 1,
      pageSize: 20,
    };

    mockApiCall
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result, rerender } = renderHook(
      ({ pageSize }) => useResultsTable("session-123", 1, pageSize),
      { initialProps: { pageSize: 10 }, wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data?.pageSize).toBe(10);
    });

    rerender({ pageSize: 20 });

    await waitFor(() => {
      expect(result.current.data?.pageSize).toBe(20);
    });

    expect(mockApiCall).toHaveBeenCalledWith("session-123", 1, 10);
    expect(mockApiCall).toHaveBeenCalledWith("session-123", 1, 20);
  });

  it("debe actualizar cuando sessionId cambia", async () => {
    const mockData1 = {
      data: [{ id: 1, name: "Result 1", status: "matched" }],
      total: 10,
      page: 1,
      pageSize: 10,
    };
    const mockData2 = {
      data: [{ id: 1, name: "Result 1", status: "matched" }],
      total: 20,
      page: 1,
      pageSize: 10,
    };

    mockApiCall
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result, rerender } = renderHook(
      ({ sessionId }) => useResultsTable(sessionId, 1, 10),
      { initialProps: { sessionId: "session-1" }, wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data?.total).toBe(10);
    });

    rerender({ sessionId: "session-2" });

    await waitFor(() => {
      expect(result.current.data?.total).toBe(20);
    });
  });

  it("debe retornar todos los campos esperados", async () => {
    const mockData = {
      data: [{ id: 1, name: "Result 1", status: "matched" }],
      total: 10,
      page: 1,
      pageSize: 10,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useResultsTable("session-123", 1, 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
  });

  it("debe manejar lista de datos vacía", async () => {
    const mockData = {
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useResultsTable("session-123", 1, 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.data).toHaveLength(0);
    expect(result.current.data?.total).toBe(0);
  });

  it("debe manejar múltiples páginas", async () => {
    const results = [];
    for (let page = 1; page <= 3; page++) {
      results.push({
        data: [
          {
            id: (page - 1) * 10 + 1,
            name: `Result ${(page - 1) * 10 + 1}`,
            status: "matched",
          },
        ],
        total: 30,
        page: page,
        pageSize: 10,
      });
    }

    results.forEach((data) => {
      mockApiCall.mockResolvedValueOnce(data);
    });

    let currentPage = 1;
    const { result, rerender } = renderHook(
      () => useResultsTable("session-123", currentPage, 10),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data?.page).toBe(1);
    });

    for (let page = 2; page <= 3; page++) {
      currentPage = page;
      rerender();

      await waitFor(() => {
        expect(result.current.data?.page).toBe(page);
      });
    }
  });

  it("debe manejar búsqueda/filtro si se proporciona", async () => {
    const mockData = {
      data: [{ id: 1, name: "Filtered Result", status: "matched" }],
      total: 1,
      page: 1,
      pageSize: 10,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useResultsTable("session-123", 1, 10, "filter"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });
  });

  it("debe reutilizar datos en caché para mismos parámetros", async () => {
    const mockData = {
      data: [{ id: 1, name: "Result 1", status: "matched" }],
      total: 1,
      page: 1,
      pageSize: 10,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result: result1 } = renderHook(
      () => useResultsTable("session-123", 1, 10),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData);
    });

    const { result: result2 } = renderHook(
      () => useResultsTable("session-123", 1, 10),
      { wrapper: createWrapper() },
    );

    expect(result2.current.data).toEqual(mockData);
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it("debe tener queryKey válida", async () => {
    mockApiCall.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    renderHook(() => useResultsTable("session-123", 1, 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalled();
    });
  });

  it("debe mantener estructura de datos consistente", async () => {
    const mockData = {
      data: [
        { id: 1, name: "Result 1", status: "matched" },
        { id: 2, name: "Result 2", status: "unmatched" },
      ],
      total: 20,
      page: 1,
      pageSize: 10,
    };

    mockApiCall.mockResolvedValue(mockData);

    const { result } = renderHook(() => useResultsTable("session-123", 1, 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data).toMatchObject({
      data: expect.any(Array),
      total: expect.any(Number),
      page: expect.any(Number),
      pageSize: expect.any(Number),
    });
  });
});
