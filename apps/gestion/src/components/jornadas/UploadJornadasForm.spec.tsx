import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { UploadJornadasForm } from "./UploadJornadasForm";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFileUpload } from "@/hooks/useFileUpload";
import api from "@/lib/api";

// --- Mocks de dependencias ---

// Mock del componente Toast para verificar si se llama con un error
jest.mock("@/components/ui/Toast", () => ({
  Toast: ({ message, type }: { message: string; type: string }) => (
    <div data-testid="toast" data-type={type}>
      {message}
    </div>
  ),
}));

// Mock de iconos para evitar problemas de renderizado de SVG
jest.mock("@/components/ui/Icon", () => ({
  Icon: () => <span data-testid="icon" />,
}));

// Mock de hooks de contexto y permisos
jest.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => true,
}));

jest.mock("@/hooks/useFileUpload", () => ({
  useFileUpload: jest.fn(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { userId: 1 } }),
}));

// Mock de la API para asegurar que no se hagan llamadas reales
jest.mock("@/lib/api");

describe("UploadJornadasForm", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <UploadJornadasForm />
      </QueryClientProvider>,
    );
  };

  it("muestra un error si se intenta enviar el formulario sin seleccionar los 4 archivos", async () => {
    // Configurar el mock para simular validación fallida
    (useFileUpload as jest.Mock).mockReturnValue({
      files: {},
      handleFileChange: jest.fn(),
      validateFiles: jest.fn().mockReturnValue("Faltan archivos requeridos"),
      resetFiles: jest.fn(),
    });

    renderComponent();

    // 1. Localizar el botón de envío (basado en el texto visto en los tests E2E)
    const submitButton = screen.getByRole("button", {
      name: /procesar archivos/i,
    });
    expect(submitButton).toBeInTheDocument();

    // 2. Simular clic sin haber seleccionado archivos
    fireEvent.click(submitButton);

    // 3. Verificar que aparece un mensaje de error
    await waitFor(() => {
      // Buscamos palabras clave comunes en mensajes de validación de archivos
      const errorRegex = /ficheros|archivos|requeridos|faltan|obligatorios/i;

      // Verificamos si aparece en un Toast (data-testid="toast") o como texto plano
      const toast = screen.queryByTestId("toast");
      if (toast) {
        expect(toast).toHaveAttribute("data-type", "error");
        expect(toast.textContent).toMatch(errorRegex);
      } else {
        expect(screen.getByText(errorRegex)).toBeInTheDocument();
      }
    });
  });

  it("muestra la barra de progreso durante la subida", async () => {
    // 1. Configurar useFileUpload para que tenga archivos válidos
    (useFileUpload as jest.Mock).mockReturnValue({
      files: {
        titulares: new File(["dummy"], "t.xlsx"),
        auxiliares: new File(["dummy"], "a.xlsx"),
        trabajadores: new File(["dummy"], "w.xlsx"),
        fichajes: new File(["dummy"], "f.xlsx"),
      },
      handleFileChange: jest.fn(),
      validateFiles: jest.fn().mockReturnValue(null), // Sin errores
      resetFiles: jest.fn(),
    });

    // 2. Configurar api.post para simular progreso
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.post as jest.Mock).mockImplementation((url, data, config) => {
      // Simulamos eventos de progreso asíncronamente
      setTimeout(() => {
        if (config && config.onUploadProgress) {
          act(() => {
            config.onUploadProgress({ loaded: 50, total: 100 });
          });
        }
      }, 100);

      // Devolvemos una promesa que tarda un poco más en resolverse
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            data: {
              success: true,
              sessionId: 123,
              stats: { procesados: 10 },
            },
          });
        }, 500);
      });
    });

    renderComponent();

    // 3. Click en procesar
    const submitButton = screen.getByRole("button", {
      name: /procesar archivos/i,
    });
    fireEvent.click(submitButton);

    // 4. Verificar que aparece el texto de progreso y la barra
    // Esperamos a que el progreso llegue al 50%
    expect(await screen.findByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Subiendo y procesando...")).toBeInTheDocument();
  });
});
