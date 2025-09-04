import { render, screen } from "@testing-library/react";
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
      screen.getByRole("heading", { name: /iniciar sesión/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre de usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /acceder/i })
    ).toBeInTheDocument();
  });

  it("should allow a user to log in successfully and redirect", async () => {
    const user = userEvent.setup();
    // Hacemos que el mock de la API sea realmente asíncrono con un pequeño delay.
    // Esto nos da tiempo para verificar el estado de carga.
    mockedApiPost.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ data: { access_token: "fake-jwt-token" } }),
            10
          )
        )
    );

    render(<LoginPage />);

    // 1. Simular que el usuario rellena el formulario
    await user.type(screen.getByLabelText(/nombre de usuario/i), "testuser");
    await user.type(screen.getByLabelText(/contraseña/i), "password123");

    // 2. Simular el clic. La función onSubmit se ejecutará y esperará a nuestra promesa.
    await user.click(screen.getByRole("button", { name: /acceder/i }));

    // 3. Ahora el componente ESTÁ en estado de carga. Lo verificamos.
    expect(await screen.findByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /acceder/i })).toBeDisabled();

    // 4. Esperamos a que la redirección final ocurra después de que la API responda.
    // `findByRole` fallará si el elemento no está, pero `waitFor` es más explícito para esperar un efecto secundario.
    await screen.findByRole("button", { name: /acceder/i }); // Esperamos a que el botón vuelva a estar disponible
    expect(mockPush).toHaveBeenCalledWith("/dashboard"); // Verificamos la redirección
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
      /el inicio de sesión está deshabilitado temporalmente/i
    );

    // Verificamos que no se intentó hacer login ni redirigir
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
