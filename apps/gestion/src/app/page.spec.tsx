import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import HomePage from "./page";
import { ApiStatusResponse } from "@cuadrantes/shared-dto";

// Mock de next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

// Mock del módulo de la API
jest.mock("@/lib/api", () => ({
  get: jest.fn(),
}));

import api from "@/lib/api";

// Wrapper para proveer el contexto necesario al componente
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }, // Deshabilitar reintentos en tests
  });
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthProvider>
  );
};

describe("Home Page", () => {
  it("should render the main heading", async () => {
    // Mock de la respuesta de la API
    const mockApiData: ApiStatusResponse = {
      welcomeMessage: "API is running!",
      databaseStatus: {
        new: { status: "ok" },
        old: { status: "ok" },
      },
    };
    (api.get as jest.Mock).mockResolvedValue({ data: mockApiData });

    render(<HomePage />, { wrapper: AllTheProviders });

    // Esperamos a que aparezca el encabezado correcto
    const heading = await screen.findByRole("heading", {
      name: /aplicación de gestión/i,
    });
    expect(heading).toBeInTheDocument();

    // Verificamos que el mensaje de bienvenida de la API se renderiza
    expect(
      await screen.findByText(mockApiData.welcomeMessage)
    ).toBeInTheDocument();
  });
});
