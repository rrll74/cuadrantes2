import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountSettingsDialog from "./AccountSettingsDialog";
import api from "@/lib/api";

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { username: "testuser" },
  }),
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

describe("AccountSettingsDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("carga el email y permite actualizarlo", async () => {
    const user = userEvent.setup();
    (api.get as jest.Mock).mockResolvedValue({
      data: { id: 1, username: "testuser", email: "user@test.com" },
    });
    (api.patch as jest.Mock).mockResolvedValue({ data: {} });

    render(<AccountSettingsDialog open onClose={jest.fn()} />);

    const emailInput = await screen.findByLabelText(/email/i);
    expect(emailInput).toHaveValue("user@test.com");

    await user.clear(emailInput);
    await user.type(emailInput, "nuevo@test.com");
    await user.type(screen.getByLabelText(/contraseña actual/i), "currentpass");

    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/users/me", {
        email: "nuevo@test.com",
        currentPassword: "currentpass",
      });
    });

    expect(
      await screen.findByText(/datos se han actualizado/i),
    ).toBeInTheDocument();
  });

  it("muestra error si no hay cambios", async () => {
    const user = userEvent.setup();
    (api.get as jest.Mock).mockResolvedValue({
      data: { id: 1, username: "testuser", email: "user@test.com" },
    });

    render(<AccountSettingsDialog open onClose={jest.fn()} />);

    await screen.findByLabelText(/email/i);

    await user.type(screen.getByLabelText(/contraseña actual/i), "currentpass");

    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(
      await screen.findByText(/no hay cambios para guardar/i),
    ).toBeInTheDocument();
  });
});
