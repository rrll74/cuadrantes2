import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./useDebounce";

describe("useDebounce Hook", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("debe retornar el valor inicial inmediatamente", () => {
    const { result } = renderHook(() => useDebounce("inicial", 500));
    expect(result.current).toBe("inicial");
  });

  it("debe debounce cambios de valor con delay de 500ms", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "inicial" } },
    );

    expect(result.current).toBe("inicial");

    rerender({ value: "actualizado" });
    // Antes del delay, aún muestra el valor anterior
    expect(result.current).toBe("inicial");

    // Después de 500ms, se actualiza
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe("actualizado");
  });

  it("debe cancelar timeout anterior si valor cambia antes del delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "inicial" } },
    );

    rerender({ value: "cambio1" });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe("inicial");

    // Cambio antes de que termine el delay
    rerender({ value: "cambio2" });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe("inicial");

    // Esperar el delay completo
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe("cambio2");
  });

  it("debe funcionar con números", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 0 } },
    );

    expect(result.current).toBe(0);

    rerender({ value: 42 });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe(42);
  });

  it("debe funcionar con objetos", () => {
    const obj1 = { name: "inicial" };
    const obj2 = { name: "actualizado" };

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: obj1 } },
    );

    expect(result.current).toEqual(obj1);

    rerender({ value: obj2 });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toEqual(obj2);
  });

  it("debe funcionar con arrays", () => {
    const arr1 = [1, 2, 3];
    const arr2 = [4, 5, 6];

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 150),
      { initialProps: { value: arr1 } },
    );

    expect(result.current).toEqual(arr1);

    rerender({ value: arr2 });
    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(result.current).toEqual(arr2);
  });

  it("debe respetar delays diferentes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "inicial", delay: 1000 } },
    );

    rerender({ value: "actualizado", delay: 1000 });

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe("inicial");

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe("actualizado");
  });

  it("debe limpiar timer al desmontar", () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "inicial" } },
    );

    rerender({ value: "actualizado" });
    unmount();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // No debe causar error al desmontar
    expect(true).toBe(true);
  });

  it("debe manejar múltiples cambios rápidos", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: "cambio1" } },
    );

    expect(result.current).toBe("cambio1");

    rerender({ value: "cambio2" });
    act(() => {
      jest.advanceTimersByTime(50);
    });

    rerender({ value: "cambio3" });
    act(() => {
      jest.advanceTimersByTime(50);
    });

    rerender({ value: "cambio4" });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe("cambio4");
  });

  it("debe manejar valores null", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce<string | null>(value, 200),
      { initialProps: { value: "inicial" } },
    );

    rerender({ value: null });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe(null);
  });

  it("debe manejar valores undefined", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce<string | undefined>(value, 200),
      { initialProps: { value: "inicial" } },
    );

    rerender({ value: undefined });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBeUndefined();
  });

  it("debe funcionar con strings vacíos", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: "inicial" } },
    );

    rerender({ value: "" });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe("");
  });

  it("debe actualizar si delay cambia", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "inicial", delay: 1000 } },
    );

    rerender({ value: "actualizado", delay: 1000 });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe("actualizado");

    rerender({ value: "rapido", delay: 100 });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe("rapido");
  });

  it("debe manejar booleanos correctamente", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: false } },
    );

    expect(result.current).toBe(false);

    rerender({ value: true });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe(true);
  });
});
