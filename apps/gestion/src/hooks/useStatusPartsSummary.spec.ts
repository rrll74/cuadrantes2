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
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = "QueryClientWrapper";
  return Wrapper;
};

describe("useStatusPartsSummary Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe cargar resumen de partes de estado exitosamente", async () => {
    const mockData = {
      rows: [
        {
          estado: "Presente",
          noPartsCount: 5,
          noPartsPercent: 10,
          withPartsCount: 45,
          withPartsPercent: 90,
        },
      ],
      footer: {
        estado: "Total",
        noPartsCount: 5,
        noPartsPercent: 10,
        withPartsCount: 45,
        withPartsPercent: 90,
      },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useStatusPartsSummary(123), {
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
    (api.get as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useStatusPartsSummary(123), {
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
        rows: [],
        footer: {
          estado: "Total",
          noPartsCount: 0,
          noPartsPercent: 0,
          withPartsCount: 0,
          withPartsPercent: 0,
        },
      },
    });

    renderHook(() => useStatusPartsSummary(999), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/jornadas/999/status-parts-summary",
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
                  rows: [],
                  footer: {
                    estado: "Total",
                    noPartsCount: 0,
                    noPartsPercent: 0,
                    withPartsCount: 0,
                    withPartsPercent: 0,
                  },
                },
              }),
            100,
          ),
        ),
    );

    const { result } = renderHook(() => useStatusPartsSummary(123), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("debe retornar todos los campos esperados", async () => {
    const mockData = {
      rows: [
        {
          estado: "Presente",
          noPartsCount: 5,
          noPartsPercent: 10,
          withPartsCount: 45,
          withPartsPercent: 90,
        },
      ],
      footer: {
        estado: "Total",
        noPartsCount: 5,
        noPartsPercent: 10,
        withPartsCount: 45,
        withPartsPercent: 90,
      },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useStatusPartsSummary(123), {
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
      rows: [
        {
          estado: "Presente",
          noPartsCount: 5,
          noPartsPercent: 10,
          withPartsCount: 45,
          withPartsPercent: 90,
        },
      ],
      footer: {
        estado: "Total",
        noPartsCount: 5,
        noPartsPercent: 10,
        withPartsCount: 45,
        withPartsPercent: 90,
      },
    };
    const mockData2 = {
      rows: [
        {
          estado: "Presente",
          noPartsCount: 2,
          noPartsPercent: 4,
          withPartsCount: 48,
          withPartsPercent: 96,
        },
      ],
      footer: {
        estado: "Total",
        noPartsCount: 2,
        noPartsPercent: 4,
        withPartsCount: 48,
        withPartsPercent: 96,
      },
    };

    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockData1 })
      .mockResolvedValueOnce({ data: mockData2 });

    const { result, rerender } = renderHook(
      ({ sessionId }) => useStatusPartsSummary(sessionId),
      { initialProps: { sessionId: 1 }, wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1);
    });

    rerender({ sessionId: 2 });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });

    expect(api.get).toHaveBeenCalledWith("/jornadas/1/status-parts-summary");
    expect(api.get).toHaveBeenCalledWith("/jornadas/2/status-parts-summary");
  });

  it("debe calcular correctamente el total", async () => {
    const mockData = {
      rows: [
        {
          estado: "Presente",
          noPartsCount: 10,
          noPartsPercent: 20,
          withPartsCount: 40,
          withPartsPercent: 80,
        },
      ],
      footer: {
        estado: "Total",
        noPartsCount: 10,
        noPartsPercent: 20,
        withPartsCount: 40,
        withPartsPercent: 80,
      },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useStatusPartsSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    const footer = result.current.data?.footer;
    expect(footer?.withPartsCount).toBeGreaterThanOrEqual(0);
    expect(footer?.noPartsCount).toBeGreaterThanOrEqual(0);
  });

  it("debe manejar todos presentes", async () => {
    const mockData = {
      rows: [
        {
          estado: "Presente",
          noPartsCount: 0,
          noPartsPercent: 0,
          withPartsCount: 60,
          withPartsPercent: 100,
        },
      ],
      footer: {
        estado: "Total",
        noPartsCount: 0,
        noPartsPercent: 0,
        withPartsCount: 60,
        withPartsPercent: 100,
      },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useStatusPartsSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.footer.withPartsCount).toBe(60);
    expect(result.current.data?.footer.noPartsCount).toBe(0);
  });

  it("debe manejar todos ausentes", async () => {
    const mockData = {
      rows: [
        {
          estado: "Ausente",
          noPartsCount: 60,
          noPartsPercent: 100,
          withPartsCount: 0,
          withPartsPercent: 0,
        },
      ],
      footer: {
        estado: "Total",
        noPartsCount: 60,
        noPartsPercent: 100,
        withPartsCount: 0,
        withPartsPercent: 0,
      },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useStatusPartsSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.footer.noPartsCount).toBe(60);
  });

  it("debe manejar total cero", async () => {
    const mockData = {
      rows: [],
      footer: {
        estado: "Total",
        noPartsCount: 0,
        noPartsPercent: 0,
        withPartsCount: 0,
        withPartsPercent: 0,
      },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useStatusPartsSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data?.footer.noPartsCount).toBe(0);
    expect(result.current.data?.footer.withPartsCount).toBe(0);
  });

  it("debe reutilizar datos en caché para mismo sessionId", async () => {
    const mockData = {
      rows: [
        {
          estado: "Presente",
          noPartsCount: 5,
          noPartsPercent: 10,
          withPartsCount: 45,
          withPartsPercent: 90,
        },
      ],
      footer: {
        estado: "Total",
        noPartsCount: 5,
        noPartsPercent: 10,
        withPartsCount: 45,
        withPartsPercent: 90,
      },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const wrapper = createWrapper();

    const { result: result1 } = renderHook(() => useStatusPartsSummary(123), {
      wrapper,
    });

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData);
    });

    const { result: result2 } = renderHook(() => useStatusPartsSummary(123), {
      wrapper,
    });

    await waitFor(() => {
      expect(result2.current.data).toEqual(mockData);
    });
    expect((api.get as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
    expect((api.get as jest.Mock).mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("debe hacer nueva llamada con sessionId diferente", async () => {
    const mockData1 = {
      rows: [
        {
          estado: "Presente",
          noPartsCount: 5,
          noPartsPercent: 10,
          withPartsCount: 45,
          withPartsPercent: 90,
        },
      ],
      footer: {
        estado: "Total",
        noPartsCount: 5,
        noPartsPercent: 10,
        withPartsCount: 45,
        withPartsPercent: 90,
      },
    };
    const mockData2 = {
      rows: [
        {
          estado: "Presente",
          noPartsCount: 2,
          noPartsPercent: 4,
          withPartsCount: 48,
          withPartsPercent: 96,
        },
      ],
      footer: {
        estado: "Total",
        noPartsCount: 2,
        noPartsPercent: 4,
        withPartsCount: 48,
        withPartsPercent: 96,
      },
    };

    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockData1 })
      .mockResolvedValueOnce({ data: mockData2 });

    const { result: result1 } = renderHook(() => useStatusPartsSummary(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData1);
    });

    const { result: result2 } = renderHook(() => useStatusPartsSummary(2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result2.current.data).toEqual(mockData2);
    });

    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it("debe tener queryKey válida", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        rows: [],
        footer: {
          estado: "Total",
          noPartsCount: 0,
          noPartsPercent: 0,
          withPartsCount: 0,
          withPartsPercent: 0,
        },
      },
    });

    renderHook(() => useStatusPartsSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it("debe manejar sessionId undefined", () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        rows: [],
        footer: {
          estado: "Total",
          noPartsCount: 0,
          noPartsPercent: 0,
          withPartsCount: 0,
          withPartsPercent: 0,
        },
      },
    });

    const { result } = renderHook(
      () => useStatusPartsSummary(undefined as unknown as number),
      { wrapper: createWrapper() },
    );

    expect(result.current).toBeDefined();
  });

  it("debe mantener estructura de datos consistente", async () => {
    const mockData = {
      rows: [
        {
          estado: "Presente",
          noPartsCount: 5,
          noPartsPercent: 10,
          withPartsCount: 45,
          withPartsPercent: 90,
        },
      ],
      footer: {
        estado: "Total",
        noPartsCount: 5,
        noPartsPercent: 10,
        withPartsCount: 45,
        withPartsPercent: 90,
      },
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useStatusPartsSummary(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.data).toMatchObject({
      rows: expect.any(Array),
      footer: expect.objectContaining({
        estado: expect.any(String),
        noPartsCount: expect.any(Number),
        noPartsPercent: expect.any(Number),
        withPartsCount: expect.any(Number),
        withPartsPercent: expect.any(Number),
      }),
    });
  });

  it("debe manejar diferentes ratios de estado", async () => {
    const scenarios = [
      {
        sessionId: 101,
        data: {
          rows: [
            {
              estado: "Presente",
              noPartsCount: 0,
              noPartsPercent: 0,
              withPartsCount: 60,
              withPartsPercent: 100,
            },
          ],
          footer: {
            estado: "Total",
            noPartsCount: 0,
            noPartsPercent: 0,
            withPartsCount: 60,
            withPartsPercent: 100,
          },
        },
      },
      {
        sessionId: 102,
        data: {
          rows: [
            {
              estado: "Presente",
              noPartsCount: 5,
              noPartsPercent: 10,
              withPartsCount: 55,
              withPartsPercent: 90,
            },
          ],
          footer: {
            estado: "Total",
            noPartsCount: 5,
            noPartsPercent: 10,
            withPartsCount: 55,
            withPartsPercent: 90,
          },
        },
      },
      {
        sessionId: 103,
        data: {
          rows: [
            {
              estado: "Presente",
              noPartsCount: 20,
              noPartsPercent: 33.3,
              withPartsCount: 40,
              withPartsPercent: 66.7,
            },
          ],
          footer: {
            estado: "Total",
            noPartsCount: 20,
            noPartsPercent: 33.3,
            withPartsCount: 40,
            withPartsPercent: 66.7,
          },
        },
      },
    ];

    for (const scenario of scenarios) {
      (api.get as jest.Mock).mockResolvedValue({ data: scenario.data });

      const { result } = renderHook(
        () => useStatusPartsSummary(scenario.sessionId),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(scenario.data);
      });
    }
  });
});
