import { distribuirPresupuesto } from "./algoritmo";
import type { MaterialInputRow } from "./types";

const materials: MaterialInputRow[] = [
  {
    rowNumber: 2,
    codigo: "MAT01",
    descripcion: "Arena fina",
    precioUnitario: 12.5,
  },
  {
    rowNumber: 3,
    codigo: "MAT02",
    descripcion: "Cemento gris",
    precioUnitario: 45.8,
  },
  {
    rowNumber: 4,
    codigo: null,
    descripcion: "Ladrillo",
    precioUnitario: 0.85,
  },
];

describe("algoritmo dist-aut-presupuesto", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("lanza error si no hay materiales", () => {
    expect(() => distribuirPresupuesto([], 100)).toThrow(
      "La lista de materiales no puede estar vacía.",
    );
  });

  it("lanza error si el presupuesto es insuficiente para mínimos", () => {
    expect(() => distribuirPresupuesto(materials, 0.05)).toThrow(
      "El presupuesto es insuficiente para cubrir el mínimo de 0.1 unidades por material.",
    );
  });

  it("asigna al menos 0.1 unidades a todos los materiales", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);

    const result = distribuirPresupuesto(materials, 100);

    expect(result.rows).toHaveLength(materials.length);
    result.rows.forEach((row) => {
      expect(row.unidades).toBeGreaterThanOrEqual(0.1);
    });
  });

  it("produce resultados diferentes por aleatoriedad", () => {
    const randomSpy = jest.spyOn(Math, "random");

    randomSpy
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);
    const first = distribuirPresupuesto(materials, 300);

    randomSpy
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(0);
    const second = distribuirPresupuesto(materials, 300);

    const firstWeights = first.rows.map((r) => r.peso);
    const secondWeights = second.rows.map((r) => r.peso);

    expect(firstWeights).not.toEqual(secondWeights);
  });

  it("ajusta el total al presupuesto objetivo con diferencia final cero", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);

    const result = distribuirPresupuesto(materials, 1500);

    expect(result.summary.diferencia).toBe(0);
    expect(result.summary.subtotalCalculado).toBe(
      result.summary.presupuestoObjetivo,
    );
  });

  it("mantiene las unidades con un único decimal y mínimo 0.1", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);

    const result = distribuirPresupuesto(materials, 987.65);

    result.rows.forEach((row) => {
      expect(row.unidades).toBeGreaterThanOrEqual(0.1);
      expect(row.unidades * 10).toBeCloseTo(Math.round(row.unidades * 10), 10);
    });
  });
});
