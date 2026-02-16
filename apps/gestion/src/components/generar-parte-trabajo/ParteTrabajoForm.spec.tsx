import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ParteTrabajoForm from "./ParteTrabajoForm";
import { generateParteTrabajoPdfFromData } from "@/lib";

jest.mock("@/lib", () => ({
  generateParteTrabajoPdfFromData: jest.fn(),
}));

describe("ParteTrabajoForm", () => {
  const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock de fetch para cargar los servicios
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue("Servicios Operativos\nLimpieza"),
    } as unknown as Response);
  });

  it("permite seleccionar servicios y generar el PDF", async () => {
    const user = userEvent.setup();
    (generateParteTrabajoPdfFromData as jest.Mock).mockResolvedValue(undefined);

    render(<ParteTrabajoForm />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/servicios-orden-trabajo.txt");
    });

    await user.type(
      await screen.findByLabelText(/n[uú]mero de documento/i),
      "PT-123",
    );
    await user.type(screen.getByLabelText(/solicitante/i), "Carlos");
    await user.type(
      screen.getByLabelText(/direcci[oó]n de realizaci[oó]n/i),
      "Calle 1",
    );
    await user.type(
      screen.getByLabelText(/descripci[oó]n del trabajo/i),
      "Trabajo realizado",
    );

    const serviciosSelect = screen.getByRole("combobox");
    await user.click(serviciosSelect);
    await user.click(await screen.findByText("Servicios Operativos"));
    await user.click(screen.getByText("Limpieza"));
    await user.keyboard("{Escape}");

    expect(
      await screen.findByText(/se generar[aá]n 2 pdfs/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /generar pdf/i }));

    await waitFor(() => {
      expect(generateParteTrabajoPdfFromData).toHaveBeenCalledWith(
        expect.objectContaining({
          numeroDocumento: "PT-123",
          solicitante: "Carlos",
          servicios: ["Servicios Operativos", "Limpieza"],
        }),
      );
    });

    expect(alertSpy).toHaveBeenCalled();
  });

  it("muestra y oculta la vista previa", async () => {
    const user = userEvent.setup();

    render(<ParteTrabajoForm />);

    await user.click(screen.getByRole("button", { name: /vista previa/i }));
    expect(
      await screen.findByText(/vista previa del pdf/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /cerrar vista previa/i }),
    );
    await waitFor(() => {
      expect(
        screen.queryByText(/vista previa del pdf/i),
      ).not.toBeInTheDocument();
    });
  });
});
