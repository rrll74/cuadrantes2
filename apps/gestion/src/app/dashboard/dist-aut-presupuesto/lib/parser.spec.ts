import { parseMaterialsWorkbook } from "./parser";

const mockRead = jest.fn();
const mockSheetToJson = jest.fn();

jest.mock("xlsx", () => ({
  read: (...args: unknown[]) => mockRead(...args),
  utils: {
    sheet_to_json: (...args: unknown[]) => mockSheetToJson(...args),
  },
}));

const createMockFile = () =>
  ({
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
  }) as unknown as File;

describe("parser dist-aut-presupuesto", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRead.mockReturnValue({
      SheetNames: ["Hoja1"],
      Sheets: { Hoja1: {} },
    });
  });

  it("retorna error cuando faltan cabeceras obligatorias", async () => {
    mockSheetToJson.mockReturnValue([["codigo", "otra_columna"]]);

    const result = await parseMaterialsWorkbook(createMockFile());

    expect(result.materials).toEqual([]);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "descripcion" }),
        expect.objectContaining({ field: "precio_unitario" }),
      ]),
    );
  });

  it("detecta descripcion duplicada", async () => {
    mockSheetToJson.mockReturnValue([
      ["codigo", "descripcion", "precio_unitario"],
      ["A", "Arena fina", "10"],
      ["B", "Arena fina", "12"],
    ]);

    const result = await parseMaterialsWorkbook(createMockFile());

    expect(result.materials).toHaveLength(1);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "descripcion",
          rowNumber: 3,
        }),
      ]),
    );
  });

  it("detecta precio no válido", async () => {
    mockSheetToJson.mockReturnValue([
      ["descripcion", "precio_unitario"],
      ["Cemento", "0"],
    ]);

    const result = await parseMaterialsWorkbook(createMockFile());

    expect(result.materials).toHaveLength(0);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "precio_unitario",
          rowNumber: 2,
        }),
      ]),
    );
  });

  it("parsea materiales válidos correctamente", async () => {
    mockSheetToJson.mockReturnValue([
      ["codigo", "descripcion", "precio_unitario"],
      ["MAT01", "Arena fina", "12,50"],
      ["", "Cemento gris", "45.80"],
    ]);

    const result = await parseMaterialsWorkbook(createMockFile());

    expect(result.errors).toHaveLength(0);
    expect(result.materials).toEqual([
      {
        rowNumber: 2,
        codigo: "MAT01",
        descripcion: "Arena fina",
        precioUnitario: 12.5,
      },
      {
        rowNumber: 3,
        codigo: null,
        descripcion: "Cemento gris",
        precioUnitario: 45.8,
      },
    ]);
  });
});
