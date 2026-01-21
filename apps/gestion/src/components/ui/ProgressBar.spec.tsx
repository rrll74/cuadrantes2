import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar Component", () => {
  it("debe renderizar correctamente con progreso del 50%", () => {
    const { container } = render(<ProgressBar progress={50} />);

    const bar = container.querySelector("div > div");
    expect(bar).toHaveStyle("width: 50%");
  });

  it("debe mostrar progreso del 0%", () => {
    const { container } = render(<ProgressBar progress={0} />);

    const bar = container.querySelector("div > div");
    expect(bar).toHaveStyle("width: 0%");
  });

  it("debe mostrar progreso del 100%", () => {
    const { container } = render(<ProgressBar progress={100} />);

    const bar = container.querySelector("div > div");
    expect(bar).toHaveStyle("width: 100%");
  });

  it("debe limitar el progreso a 100% cuando se pasa un valor mayor", () => {
    const { container } = render(<ProgressBar progress={150} />);

    const bar = container.querySelector("div > div");
    expect(bar).toHaveStyle("width: 100%");
  });

  it("debe limitar el progreso a 0% cuando se pasa un valor negativo", () => {
    const { container } = render(<ProgressBar progress={-50} />);

    const bar = container.querySelector("div > div");
    expect(bar).toHaveStyle("width: 0%");
  });

  it("debe aplicar color por defecto (azul)", () => {
    const { container } = render(<ProgressBar progress={50} />);

    const bar = container.querySelector("div > div");
    expect(bar).toHaveClass("bg-blue-600");
  });

  it("debe aplicar color personalizado", () => {
    const { container } = render(
      <ProgressBar progress={50} color="bg-green-600" />,
    );

    const bar = container.querySelector("div > div");
    expect(bar).toHaveClass("bg-green-600");
    expect(bar).not.toHaveClass("bg-blue-600");
  });

  it("debe aplicar clase personalizada al contenedor", () => {
    const { container } = render(
      <ProgressBar progress={50} className="my-custom-class" />,
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("my-custom-class");
  });

  it("debe tener transición suave", () => {
    const { container } = render(<ProgressBar progress={50} />);

    const bar = container.querySelector("div > div");
    expect(bar).toHaveClass("transition-all", "duration-300", "ease-out");
  });

  it("debe renderizar con progreso decimal", () => {
    const { container } = render(<ProgressBar progress={33.33} />);

    const bar = container.querySelector("div > div");
    expect(bar).toHaveStyle("width: 33.33%");
  });

  it("debe actualizar el progreso cuando cambia la propiedad", () => {
    const { container, rerender } = render(<ProgressBar progress={25} />);

    let bar = container.querySelector("div > div");
    expect(bar).toHaveStyle("width: 25%");

    rerender(<ProgressBar progress={75} />);
    bar = container.querySelector("div > div");
    expect(bar).toHaveStyle("width: 75%");
  });

  it("debe manejar múltiples colores", () => {
    const colors = ["bg-red-600", "bg-yellow-600", "bg-green-600"];

    colors.forEach((color) => {
      const { container } = render(<ProgressBar progress={50} color={color} />);

      const bar = container.querySelector("div > div");
      expect(bar).toHaveClass(color);
    });
  });

  it("debe aplicar estilos de contenedor correctamente", () => {
    const { container } = render(<ProgressBar progress={50} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass(
      "w-full",
      "bg-gray-200",
      "rounded-full",
      "h-2.5",
    );
  });

  it("debe aplicar estilos de barra correctamente", () => {
    const { container } = render(<ProgressBar progress={50} />);

    const bar = container.querySelector("div > div") as HTMLElement;
    expect(bar).toHaveClass("h-2.5", "rounded-full");
  });
});
