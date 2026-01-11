import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Pagination } from "./Pagination";

describe("Pagination Component", () => {
  const mockOnPageChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe renderizar correctamente la información de la página", () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />,
    );

    // Verifica que se muestra el texto "Página 2 de 5"
    // Usamos una función matcher porque el texto está dividido en spans dentro de un <p>
    expect(
      screen.getByText((content, element) => {
        return (
          element?.tagName.toLowerCase() === "p" &&
          element.textContent === "Página 2 de 5"
        );
      }),
    ).toBeInTheDocument();
  });

  it("debe llamar a onPageChange con la página anterior al hacer clic en Anterior", () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />,
    );

    // Hay botones para móvil y desktop, obtenemos todos por su nombre accesible
    const prevButtons = screen.getAllByRole("button", { name: /anterior/i });

    // Hacemos clic en el primero (cualquiera debería funcionar)
    fireEvent.click(prevButtons[0]);

    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it("debe llamar a onPageChange con la página siguiente al hacer clic en Siguiente", () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />,
    );

    const nextButtons = screen.getAllByRole("button", { name: /siguiente/i });
    fireEvent.click(nextButtons[0]);

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it("debe deshabilitar el botón Anterior en la primera página", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />,
    );

    const prevButtons = screen.getAllByRole("button", { name: /anterior/i });
    prevButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("debe deshabilitar el botón Siguiente en la última página", () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />,
    );

    const nextButtons = screen.getAllByRole("button", { name: /siguiente/i });
    nextButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
