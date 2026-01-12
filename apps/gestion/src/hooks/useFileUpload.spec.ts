import { renderHook, act } from "@testing-library/react";
import { useFileUpload } from "./useFileUpload";

describe("useFileUpload Hook", () => {
  it("debe inicializarse con todos los archivos en null", () => {
    const { result } = renderHook(() => useFileUpload());
    expect(result.current.files).toEqual({
      titulares: null,
      auxiliares: null,
      trabajadores: null,
      fichajes: null,
    });
  });

  it("debe actualizar el estado del archivo cuando se llama a handleFileChange", () => {
    const { result } = renderHook(() => useFileUpload());
    const dummyFile = new File(["content"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    act(() => {
      result.current.handleFileChange("titulares", dummyFile);
    });

    expect(result.current.files.titulares).toBe(dummyFile);
    // Los demás deben seguir siendo null
    expect(result.current.files.auxiliares).toBeNull();
  });

  it("debe devolver error si faltan archivos requeridos", () => {
    const { result } = renderHook(() => useFileUpload());

    // Inicialmente faltan todos
    expect(result.current.validateFiles()).toMatch(
      /Faltan archivos requeridos/,
    );

    // Añadimos uno
    const dummyFile = new File(["content"], "test.xlsx");
    act(() => {
      result.current.handleFileChange("titulares", dummyFile);
    });

    // Aún deben faltar los otros 3
    const error = result.current.validateFiles();
    expect(error).toMatch(/Faltan archivos requeridos/);
    expect(error).toMatch(/auxiliares/);
    expect(error).not.toMatch(/titulares/); // Titulares ya no debería salir en la lista
  });

  it("debe devolver error si algún archivo está vacío (0 bytes)", () => {
    const { result } = renderHook(() => useFileUpload());
    const emptyFile = new File([], "empty.xlsx"); // Tamaño 0
    const validFile = new File(["content"], "valid.xlsx");

    act(() => {
      result.current.handleFileChange("titulares", validFile);
      result.current.handleFileChange("auxiliares", validFile);
      result.current.handleFileChange("trabajadores", validFile);
      result.current.handleFileChange("fichajes", emptyFile); // Este es el vacío
    });

    const error = result.current.validateFiles();
    expect(error).toMatch(/Los siguientes archivos están vacíos/);
    expect(error).toMatch(/fichajes/);
  });

  it("debe devolver null si todos los archivos son válidos", () => {
    const { result } = renderHook(() => useFileUpload());
    const validFile = new File(["content"], "valid.xlsx");

    act(() => {
      result.current.handleFileChange("titulares", validFile);
      result.current.handleFileChange("auxiliares", validFile);
      result.current.handleFileChange("trabajadores", validFile);
      result.current.handleFileChange("fichajes", validFile);
    });

    expect(result.current.validateFiles()).toBeNull();
  });

  it("debe resetear el estado al llamar a resetFiles", () => {
    const { result } = renderHook(() => useFileUpload());
    const file = new File(["content"], "test.xlsx");

    act(() => {
      result.current.handleFileChange("titulares", file);
      result.current.resetFiles();
    });

    expect(result.current.files.titulares).toBeNull();
  });
});
