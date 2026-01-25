import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar Component", () => {
  it("debe renderizar correctamente con progreso del 50%", () => {
    render(<ProgressBar progress={50} />);

    const bar = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(bar).toHaveStyle("width: 50%");
  });

  it("debe mostrar progreso del 0%", () => {
    render(<ProgressBar progress={0} />);

    const bar = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(bar).toHaveStyle("width: 0%");
  });

  it("debe mostrar progreso del 100%", () => {
    render(<ProgressBar progress={100} />);

    const bar = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(bar).toHaveStyle("width: 100%");
  });

  it("debe limitar el progreso a 100% cuando se pasa un valor mayor", () => {
    render(<ProgressBar progress={150} />);

    const bar = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(bar).toHaveStyle("width: 100%");
  });

  it("debe limitar el progreso a 0% cuando se pasa un valor negativo", () => {
    render(<ProgressBar progress={-50} />);

    const bar = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(bar).toHaveStyle("width: 0%");
  });

  it("debe aplicar color por defecto (azul)", () => {
    render(<ProgressBar progress={50} />);

    const bar = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(bar).toHaveClass("bg-blue-600");
  });

  it("debe aplicar color personalizado", () => {
    render(<ProgressBar progress={50} color="bg-green-600" />);

    const bar = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(bar).toHaveClass("bg-green-600");
    expect(bar).not.toHaveClass("bg-blue-600");
  });

  it("debe aplicar clase personalizada al contenedor", () => {
    render(<ProgressBar progress={50} className="my-custom-class" />);

    const wrapper = screen.getByRole("progressbar");
    expect(wrapper).toHaveClass("my-custom-class");
  });

  it("debe tener transición suave", () => {
    render(<ProgressBar progress={50} />);

    const bar = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(bar).toHaveClass("transition-all duration-300 ease-out");
  });

  it("debe renderizar con progreso decimal", () => {
    render(<ProgressBar progress={33.33} />);

    const bar = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(bar).toHaveStyle("width: 33.33%");
  });

  it("debe actualizar el progreso cuando cambia la propiedad", () => {
    const { rerender } = render(<ProgressBar progress={25} />);

    let bar = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(bar).toHaveStyle("width: 25%");

    rerender(<ProgressBar progress={75} />);
    bar = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(bar).toHaveStyle("width: 75%");
  });

  it("debe manejar múltiples colores", () => {
    const colors = ["bg-red-600", "bg-yellow-600", "bg-green-600"];

    colors.forEach((color) => {
      const { unmount } = render(<ProgressBar progress={50} color={color} />);

      const bar = screen.getByRole("progressbar").firstChild as HTMLElement;
      expect(bar).toHaveClass(color);
      unmount();
    });
  });

  it("debe aplicar estilos de contenedor correctamente", () => {
    render(<ProgressBar progress={50} />);

    const wrapper = screen.getByRole("progressbar");
    expect(wrapper).toHaveClass("w-full bg-gray-200 rounded-full h-2.5");
  });

  it("debe aplicar estilos de barra correctamente", () => {
    render(<ProgressBar progress={50} />);

    const bar = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(bar).toHaveClass("h-2.5 rounded-full");
  });

  it("debe tener los atributos ARIA correctos", () => {
    render(<ProgressBar progress={50} color="bg-green-600" />);
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "50");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
  });
});
