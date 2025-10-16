import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

// --- Mocks de las dependencias ---

// Mock del hook useAuth
jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

// Mock del hook useRouter
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock del módulo de la API
jest.mock("@/lib/api");

// --- Tipado para los mocks para tener autocompletado ---
const mockedUseAuth = useAuth as jest.Mock;
const mockedUseRouter = useRouter as jest.Mock;
const mockedApiPost = api.post as jest.Mock;

describe("LoginPage", () => {
  const mockLogin = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    // Reseteamos los mocks antes de cada test
    jest.clearAllMocks();

    // Proporcionamos los valores que devolverán los hooks mockeados
    mockedUseAuth.mockReturnValue({
      login: mockLogin,
    });
    mockedUseRouter.mockReturnValue({
      push: mockPush,
    });
  });

  it("should render the login form correctly", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre de usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /acceder/i }),
    ).toBeInTheDocument();
  });

  it("should allow a user to log in successfully and redirect", async () => {
    const user = userEvent.setup();
    const fakeToken = "fake-jwt-token";
    mockedApiPost.mockResolvedValue({ data: { access_token: fakeToken } });

    render(<LoginPage />);

    // 1. Simular que el usuario rellena el formulario
    await user.type(screen.getByLabelText(/nombre de usuario/i), "testuser");
    await user.type(screen.getByLabelText(/contraseña/i), "password123");
    const submitButton = screen.getByRole("button", { name: /acceder/i });

    // 2. Simular el clic.
    await user.click(submitButton);

    // 3. Esperar a que se completen las acciones asíncronas (llamada a la API, login, redirección)
    // `waitFor` es ideal para esperar efectos secundarios como una llamada a una función.
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(fakeToken);
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    // Opcional: Verificar que el botón ya no está deshabilitado después de todo el proceso.
    expect(submitButton).not.toBeDisabled();
  });

  it("should display a generic error message on failed login", async () => {
    const user = userEvent.setup();
    // Simulamos un error de credenciales incorrectas (ej. 401)
    mockedApiPost.mockRejectedValue({ response: { status: 401 } });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/nombre de usuario/i), "wronguser");
    await user.type(screen.getByLabelText(/contraseña/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /acceder/i }));

    // Esperamos a que aparezca el mensaje de error
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/usuario o contraseña incorrectos/i);

    // Verificamos que no se intentó hacer login ni redirigir
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("should display a lockdown error message when status is 503", async () => {
    const user = userEvent.setup();
    // Simulamos un error de bloqueo por parte del admin (503)
    mockedApiPost.mockRejectedValue({ response: { status: 503 } });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/nombre de usuario/i), "anyuser");
    await user.type(screen.getByLabelText(/contraseña/i), "anypass");
    await user.click(screen.getByRole("button", { name: /acceder/i }));

    // Esperamos a que aparezca el mensaje de error específico
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      /el inicio de sesión está deshabilitado temporalmente/i,
    );

    // Verificamos que no se intentó hacer login ni redirigir
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
