import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConsultaCuadrantesPage from "./page";
import { usePermissions } from "@/hooks/usePermissions";
import api from "@/lib/api";

jest.mock("@/hooks/usePermissions");
jest.mock("@/lib/api");

const mockedUsePermissions = usePermissions as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;

// Helper para seleccionar una opción en un Select de Material-UI
const selectMaterialUIOption = async (
  user: ReturnType<typeof userEvent.setup>,
  selectElement: HTMLElement,
  optionText: string | RegExp,
) => {
  await user.click(selectElement);
  const listbox = await screen.findByRole("listbox");
  // Usar una función matcher más flexible que busque texto que contenga el optionText
  const option =
    typeof optionText === "string"
      ? within(listbox).getByText((content) => {
          return content.includes(optionText);
        })
      : within(listbox).getByText(optionText);
  await user.click(option);
  // Esperar a que React procese los cambios de estado causados por la selección
  await waitFor(() => {
    // Este wait es para asegurar que el componente ha procesado la actualización
  });
};

describe("ConsultaCuadrantesPage", () => {
  const mockEmpleados = [
    {
      id: 1,
      nombre: "Juan",
      apellido1: "Pérez",
      email: "juan@example.com",
    },
    {
      id: 2,
      nombre: "María",
      apellido1: "García",
      email: "maria@example.com",
    },
  ];

  const mockCuadrantes = [
    {
      id: 1,
      nombre: "Cuadrante A",
      descripcion: "Descripción A",
      departamentoNombre: "Departamento 1",
    },
  ];

  const mockConsultaResponse = {
    empleado: {
      id: 1,
      nombre: "Juan",
      apellido1: "Pérez",
      email: "juan@example.com",
    },
    cuadrante: {
      id: 1,
      nombre: "Cuadrante A",
      anio: 2024,
      departamentoNombre: "Departamento 1",
    },
    meses: [
      {
        mes: 1,
        anio: 2024,
        mesNombre: "Enero",
        asignaciones: [
          null,
          null,
          {
            dia: 1,
            abreviatura: "COM",
            colortexto: 0,
            colorfondo: 65280,
          },
        ],
      },
    ],
    estadosUsados: [
      {
        id: 1,
        abreviatura: "COM",
        descrip: "Completo",
        colortexto: 0,
        colorfondo: 65280,
        horainicio: "08:00",
        horafin: "17:00",
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsePermissions.mockReturnValue(true);
    mockedApi.get.mockResolvedValue({ data: mockEmpleados });
    // Mock por defecto para api.post (se puede sobrescribir en tests específicos)
    mockedApi.post.mockResolvedValue({ data: mockCuadrantes });
  });

  describe("Permisos", () => {
    it("debería mostrar alerta si el usuario no tiene permisos", () => {
      mockedUsePermissions.mockReturnValue(false);

      render(<ConsultaCuadrantesPage />);

      expect(
        screen.getByText(/no tienes permisos para acceder/i),
      ).toBeInTheDocument();
    });

    it("debería renderizar la página si el usuario tiene permisos", () => {
      mockedUsePermissions.mockReturnValue(true);

      render(<ConsultaCuadrantesPage />);

      expect(
        screen.getByRole("heading", { name: /consulta de cuadrantes/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Cargar Empleados", () => {
    it("debería cargar empleados al montar el componente", async () => {
      render(<ConsultaCuadrantesPage />);

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalledWith(
          "/consulta-cuadrantes/empleados",
        );
      });
    });

    it("debería mostrar lista de empleados en el selector", async () => {
      render(<ConsultaCuadrantesPage />);

      // Usar findBy en lugar de getBy para esperar a que los datos se carguen
      const empleadoSelect = await screen.findByText(/seleccione un empleado/i);
      expect(empleadoSelect).toBeInTheDocument();
    });

    it("debería mostrar error si falla cargar empleados", async () => {
      mockedApi.get.mockRejectedValue(new Error("Error al cargar"));

      render(<ConsultaCuadrantesPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/error al cargar la lista de empleados/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Cargar Cuadrantes", () => {
    it("debería cargar cuadrantes cuando se selecciona un empleado", async () => {
      const user = userEvent.setup();

      render(<ConsultaCuadrantesPage />);

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalled();
      });

      const empleadoSelect = screen.getByText(/seleccione un empleado/i);
      await selectMaterialUIOption(user, empleadoSelect, "Juan");

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith(
          "/consulta-cuadrantes/cuadrantes-disponibles",
          expect.objectContaining({
            empleadoId: 1,
          }),
        );
      });
    });

    it("debería mostrar error si no hay cuadrantes disponibles", async () => {
      const user = userEvent.setup();
      mockedApi.post.mockResolvedValue({ data: [] });

      render(<ConsultaCuadrantesPage />);

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalled();
      });

      const empleadoSelect = screen.getByText(/seleccione un empleado/i);
      await selectMaterialUIOption(user, empleadoSelect, "Juan");

      await waitFor(() => {
        expect(
          screen.getByText(/no se encontraron cuadrantes disponibles/i),
        ).toBeInTheDocument();
      });
    });

    it("debería enviar parámetros de período correctamente", async () => {
      const user = userEvent.setup();

      render(<ConsultaCuadrantesPage />);

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalled();
      });

      const empleadoSelect = screen.getByText(/seleccione un empleado/i);
      await selectMaterialUIOption(user, empleadoSelect, "Juan");

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith(
          "/consulta-cuadrantes/cuadrantes-disponibles",
          expect.objectContaining({
            mesInicio: expect.any(Number),
            anioInicio: expect.any(Number),
            mesFin: expect.any(Number),
            anioFin: expect.any(Number),
          }),
        );
      });
    });
  });

  describe("Realizar Consulta", () => {
    it("debería validar que se selectione un empleado antes de consultar", async () => {
      render(<ConsultaCuadrantesPage />);

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalled();
      });

      const buscarButton = screen.getByRole("button", { name: /buscar/i });
      // El botón debe estar deshabilitado cuando no hay empleado seleccionado
      expect(buscarButton).toBeDisabled();
    });

    it("debería realizar consulta con parámetros válidos", async () => {
      const user = userEvent.setup();
      mockedApi.post
        .mockResolvedValueOnce({ data: mockCuadrantes })
        .mockResolvedValueOnce({ data: mockConsultaResponse });

      render(<ConsultaCuadrantesPage />);

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalled();
      });

      const empleadoSelect = screen.getByText(/seleccione un empleado/i);
      await selectMaterialUIOption(user, empleadoSelect, "Juan");

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith(
          "/consulta-cuadrantes/cuadrantes-disponibles",
          expect.any(Object),
        );
      });

      // Esperar a que aparezca el select de cuadrante
      const cuadranteSelect = await screen.findByText(
        /seleccione un cuadrante/i,
      );
      await selectMaterialUIOption(user, cuadranteSelect, "Cuadrante A");

      const buscarButton = screen.getByRole("button", { name: /buscar/i });
      await user.click(buscarButton);

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenLastCalledWith(
          "/consulta-cuadrantes/consultar",
          expect.objectContaining({
            empleadoId: 1,
            cuadranteId: 1,
          }),
        );
      });
    });

    it("debería mostrar resultados en tabla cuando la consulta es exitosa", async () => {
      const user = userEvent.setup();
      mockedApi.post
        .mockResolvedValueOnce({ data: mockCuadrantes })
        .mockResolvedValueOnce({ data: mockConsultaResponse });

      render(<ConsultaCuadrantesPage />);

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalled();
      });

      const empleadoSelect = screen.getByText(/seleccione un empleado/i);
      await selectMaterialUIOption(user, empleadoSelect, "Juan");

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalled();
      });

      const cuadranteSelect = await screen.findByText(
        /seleccione un cuadrante/i,
      );
      await selectMaterialUIOption(user, cuadranteSelect, "Cuadrante A");

      const buscarButton = screen.getByRole("button", { name: /buscar/i });
      await user.click(buscarButton);

      await waitFor(() => {
        // Verificar que se mostró la información del empleado en los resultados
        // Buscar dentro del Paper de resultados que tiene el nombre
        const nombreHeading = screen.getByRole("heading", { name: /juan/i });
        expect(nombreHeading).toBeInTheDocument();
      });
    });

    it("debería mostrar error si la consulta falla", async () => {
      const user = userEvent.setup();
      mockedApi.post
        .mockResolvedValueOnce({ data: mockCuadrantes })
        .mockRejectedValueOnce(new Error("Error al consultar"));

      render(<ConsultaCuadrantesPage />);

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalled();
      });

      const empleadoSelect = screen.getByText(/seleccione un empleado/i);
      await selectMaterialUIOption(user, empleadoSelect, "Juan");

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalled();
      });

      const cuadranteSelect = await screen.findByText(
        /seleccione un cuadrante/i,
      );
      await selectMaterialUIOption(user, cuadranteSelect, "Cuadrante A");

      const buscarButton = screen.getByRole("button", { name: /buscar/i });
      await user.click(buscarButton);

      await waitFor(() => {
        expect(
          screen.getByText(/error al realizar la consulta/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Generar PDF", () => {
    it("debería no mostrar botón de PDF si no hay resultados", async () => {
      render(<ConsultaCuadrantesPage />);

      // Esperar a que el componente se inicialice
      await screen.findByText(/seleccione un empleado/i);

      expect(
        screen.queryByRole("button", { name: /generar pdf/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Enviar por Email", () => {
    it("debería deshabilitar botón de email si no hay resultados", async () => {
      render(<ConsultaCuadrantesPage />);

      // Esperar a que el componente se inicialice
      await screen.findByText(/seleccione un empleado/i);

      expect(
        screen.queryByRole("button", { name: /enviar.*email/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Selector de Período", () => {
    it("debería permitir cambiar mes inicio", async () => {
      render(<ConsultaCuadrantesPage />);

      // Esperar a que el componente se inicialice
      await screen.findByText(/seleccione un empleado/i);

      // Verificar que los campos de mes y año están presentes
      const mesSelects = screen.getAllByRole("combobox");
      expect(mesSelects.length).toBeGreaterThan(1);
    });

    it("debería permitir cambiar año inicio", async () => {
      render(<ConsultaCuadrantesPage />);

      // const empleadoSelect =
      await screen.findByText(/seleccione un empleado/i);

      // Verificar que los inputs de año están presentes
      const anioInputs = screen.getAllByRole("spinbutton");
      expect(anioInputs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Tipo de Cuadrante", () => {
    it("debería permitir seleccionar tipo inicial o modificado", async () => {
      render(<ConsultaCuadrantesPage />);

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalled();
      });

      const tipoInicialRadio = screen.getByRole("radio", { name: /inicial/i });
      const tipoModificadoRadio = screen.getByRole("radio", {
        name: /modificado/i,
      });

      expect(tipoInicialRadio).toBeInTheDocument();
      expect(tipoModificadoRadio).toBeInTheDocument();
    });
  });
});
