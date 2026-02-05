import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import PDFPreview from "./PDFPreview";

describe("PDFPreview", () => {
  it("renderiza datos y las imagenes cargadas", () => {
    render(
      <PDFPreview
        data={{
          fecha: "2026-02-05",
          numeroDocumento: "PT-900",
          tieneDocumentacion: true,
          solicitante: "Ana",
          servicios: ["Servicio A"],
          direccion: "Calle 3",
          descripcion: "Descripcion",
          observaciones: "Observaciones",
          fechaEjecucion: "2026-02-06",
        }}
        imagenes={["data:image/png;base64,abc"]}
      />,
    );

    expect(screen.getByText(/parte de trabajo/i)).toBeInTheDocument();
    expect(screen.getByText(/Servicio A/)).toBeInTheDocument();
    expect(screen.getByAltText("trabajo-0")).toBeInTheDocument();
  });
});
