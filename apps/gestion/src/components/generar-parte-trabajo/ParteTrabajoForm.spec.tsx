import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ParteTrabajoForm from "./ParteTrabajoForm";
import axios from "axios";
import { generatePDFFromData } from "@/lib/pdf-generator";

jest.mock("axios");

jest.mock("@/lib/pdf-generator", () => ({
  generatePDFFromData: jest.fn(),
}));

describe("ParteTrabajoForm", () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: [
        { id: 1, nombre: "Servicios Operativos" },
        { id: 2, nombre: "Limpieza" },
      ],
    });
  });

  it("permite seleccionar servicios y generar el PDF", async () => {
    const user = userEvent.setup();
    (generatePDFFromData as jest.Mock).mockResolvedValue(undefined);

    render(<ParteTrabajoForm />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith("/olddepartamentos");
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
      expect(generatePDFFromData).toHaveBeenCalledWith(
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
