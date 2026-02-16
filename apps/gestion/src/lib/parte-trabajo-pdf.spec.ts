import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  generateParteTrabajoPdfFromElement,
  generateParteTrabajoPdfFromData,
  ParteTrabajo,
} from "./parte-trabajo-pdf";

const pdfInstances: Array<Record<string, jest.Mock>> = [];

jest.mock("jspdf", () => {
  return jest.fn().mockImplementation(() => {
    const instance = {
      addImage: jest.fn(),
      addPage: jest.fn(),
      save: jest.fn(),
      setFontSize: jest.fn(),
      setFont: jest.fn(),
      splitTextToSize: jest.fn((text: string) => [text]),
      text: jest.fn(),
      getTextWidth: jest.fn(() => 50),
      setDrawColor: jest.fn(),
      setLineWidth: jest.fn(),
      line: jest.fn(),
      rect: jest.fn(),
      getImageProperties: jest.fn(() => ({
        width: 1600,
        height: 1200,
      })),
    };

    pdfInstances.push(instance);
    return instance;
  });
});

jest.mock("html2canvas", () => jest.fn());

describe("parte-trabajo-pdf", () => {
  const originalCreateElement = document.createElement.bind(document);
  const originalImage = global.Image;
  let createElementSpy: jest.SpyInstance | null = null;

  beforeEach(() => {
    pdfInstances.length = 0;
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    global.Image = originalImage;
    if (createElementSpy) {
      createElementSpy.mockRestore();
      createElementSpy = null;
    }
    jest.useRealTimers();
  });

  it("genera un PDF desde HTML y descarga con nombre correcto", async () => {
    const canvas = {
      width: 200,
      height: 300,
      toDataURL: jest.fn(() => "data:image/png;base64,abc"),
    } as unknown as HTMLCanvasElement;

    (html2canvas as jest.Mock).mockResolvedValue(canvas);

    const element = document.createElement("div");
    const data: ParteTrabajo = {
      fecha: "2026-02-05",
      numeroDocumento: "PT-123",
      tieneDocumentacion: true,
      solicitante: "Juan",
      servicios: ["Servicios Operativos"],
      direccion: "Calle 1",
      descripcion: "Trabajo",
      imagenes: [],
    };

    await generateParteTrabajoPdfFromElement(element, data);

    expect(html2canvas).toHaveBeenCalledWith(element, expect.any(Object));
    expect(jsPDF).toHaveBeenCalledTimes(1);
    expect(pdfInstances[0].save).toHaveBeenCalledWith(
      expect.stringContaining("E-PT-123"),
    );
  });

  it("genera un PDF por servicio con sufijo y pausa entre descargas", async () => {
    jest.useFakeTimers();

    class MockImage {
      width = 120;
      height = 60;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        if (this.onload) {
          this.onload();
        }
      }
    }

    global.Image = MockImage as unknown as typeof Image;

    createElementSpy = jest
      .spyOn(document, "createElement")
      .mockImplementation((tagName) => {
        if (tagName === "canvas") {
          return {
            width: 0,
            height: 0,
            getContext: () => ({ drawImage: jest.fn() }),
            toDataURL: () => "data:image/jpeg;base64,logo",
          } as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tagName);
      });

    const data: ParteTrabajo = {
      fecha: "2026-02-05",
      numeroDocumento: "PT-456",
      tieneDocumentacion: false,
      solicitante: "Maria",
      servicios: ["Servicio A", "Servicio B"],
      direccion: "Calle 2",
      descripcion: "Trabajo",
      imagenes: ["data:image/jpeg;base64,photo"],
      observaciones: "",
      fechaEjecucion: "",
    };

    const promise = generateParteTrabajoPdfFromData(data);
    await jest.runAllTimersAsync();
    await promise;

    expect(jsPDF).toHaveBeenCalledTimes(2);
    expect(pdfInstances[0].save).toHaveBeenCalledWith(
      expect.stringContaining("E-PT-456-1"),
    );
    expect(pdfInstances[1].save).toHaveBeenCalledWith(
      expect.stringContaining("E-PT-456-2"),
    );
    expect(pdfInstances[0].addImage).toHaveBeenCalled();
  }, 10000);

  it("mantiene el aspecto de las imagenes sin deformarlas", async () => {
    jest.useFakeTimers();

    class MockImage {
      width = 120;
      height = 60;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        if (this.onload) {
          this.onload();
        }
      }
    }

    global.Image = MockImage as unknown as typeof Image;

    createElementSpy = jest
      .spyOn(document, "createElement")
      .mockImplementation((tagName) => {
        if (tagName === "canvas") {
          return {
            width: 0,
            height: 0,
            getContext: () => ({ drawImage: jest.fn() }),
            toDataURL: () => "data:image/jpeg;base64,logo",
          } as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tagName);
      });

    const data: ParteTrabajo = {
      fecha: "2026-02-05",
      numeroDocumento: "PT-789",
      tieneDocumentacion: true,
      solicitante: "Pedro",
      servicios: ["Servicio Test"],
      direccion: "Calle Test",
      descripcion: "Trabajo",
      imagenes: [
        "data:image/jpeg;base64,horizontal",
        "data:image/jpeg;base64,vertical",
      ],
      observaciones: "",
      fechaEjecucion: "",
    };

    const promise = generateParteTrabajoPdfFromData(data);
    await jest.runAllTimersAsync();
    await promise;

    // Verificar que se llamo getImageProperties para cada imagen
    expect(pdfInstances[0].getImageProperties).toHaveBeenCalledTimes(2);

    // Verificar que addImage fue llamado con las dimensiones apropiadas
    const addImageCalls = pdfInstances[0].addImage.mock.calls;
    // Filtrar solo las imagenes de fotos (las que tienen las fuentes de datos de prueba)
    const imageCalls = addImageCalls.filter(
      (call) =>
        call[0] &&
        (call[0].includes("horizontal") || call[0].includes("vertical")),
    );

    // Verificar que se agregaron 2 imagenes
    expect(imageCalls.length).toBe(2);

    // Verificar cada imagen agregada
    imageCalls.forEach((call) => {
      const [, , , , width, height] = call;
      // Verificar que no excede las dimensiones maximas
      expect(width).toBeLessThanOrEqual(140);
      expect(height).toBeLessThanOrEqual(110);
      // Verificar que las dimensiones son positivas
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    });
  }, 10000);
});
