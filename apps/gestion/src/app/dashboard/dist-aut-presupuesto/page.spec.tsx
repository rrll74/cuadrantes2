import { render, screen } from "@testing-library/react";
import { PERMISSIONS } from "@cuadrantes/shared-dto";
import DistribucionPresupuestoPage from "./page";

const mockUsePermissions = jest.fn();

jest.mock("@/hooks/usePermissions", () => ({
  usePermissions: (permission: string) => mockUsePermissions(permission),
}));

jest.mock("./components/DistribucionPresupuestoForm", () => ({
  DistribucionPresupuestoForm: () => (
    <div data-testid="distribucion-presupuesto-form">Formulario mock</div>
  ),
}));

describe("DistribucionPresupuestoPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("muestra error sin permisos", () => {
    mockUsePermissions.mockImplementation(() => false);

    render(<DistribucionPresupuestoPage />);

    expect(
      screen.getByText(/no tienes permisos para acceder a esta sección/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("distribucion-presupuesto-form"),
    ).not.toBeInTheDocument();
  });

  it("renderiza contenido cuando tiene permiso específico", () => {
    mockUsePermissions.mockImplementation((permission: string) => {
      if (permission === PERMISSIONS.PRESUPUESTO_DISTRIBUCION) {
        return true;
      }
      return false;
    });

    render(<DistribucionPresupuestoPage />);

    expect(
      screen.getByRole("heading", {
        name: /distribución automática de presupuesto/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("distribucion-presupuesto-form"),
    ).toBeInTheDocument();
  });

  it("renderiza contenido cuando es admin", () => {
    mockUsePermissions.mockImplementation((permission: string) => {
      if (permission === PERMISSIONS.ADMIN) {
        return true;
      }
      return false;
    });

    render(<DistribucionPresupuestoPage />);

    expect(
      screen.getByTestId("distribucion-presupuesto-form"),
    ).toBeInTheDocument();
  });
});
