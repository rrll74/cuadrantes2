import "@testing-library/jest-dom";
import React from "react";
import { render } from "@testing-library/react";
import { Icon } from "./Icon";
import { ICONS } from "./icons";

describe("Icon Component", () => {
  it("debe renderizar con path único", () => {
    const { container } = render(<Icon path="M5 10h14" />);

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();

    const path = svg?.querySelector("path");
    expect(path).toHaveAttribute("d", "M5 10h14");
  });

  it("debe renderizar con múltiples paths", () => {
    const paths = ["M10 5L20 15", "M20 5L10 15"];
    const { container } = render(<Icon path={paths} />);

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();

    const pathElements = svg?.querySelectorAll("path");
    expect(pathElements?.length).toBe(2);
    expect(pathElements?.[0]).toHaveAttribute("d", paths[0]);
    expect(pathElements?.[1]).toHaveAttribute("d", paths[1]);
  });

  it("debe usar viewBox por defecto", () => {
    const { container } = render(<Icon path="M5 10h14" />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
  });

  it("debe permitir viewBox personalizado", () => {
    const { container } = render(
      <Icon path="M5 10h14" viewBox="0 0 100 100" />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 100 100");
  });

  it("debe renderizar con estilo outline por defecto", () => {
    const { container } = render(<Icon path="M5 10h14" />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("fill", "none");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("stroke-width", "1.5");
  });

  it("debe renderizar con estilo solid", () => {
    const { container } = render(<Icon path="M5 10h14" solid={true} />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("fill", "currentColor");
    expect(svg).toHaveAttribute("stroke", "none");
    expect(svg).toHaveAttribute("stroke-width", "0");
  });

  it("debe aplicar className por defecto", () => {
    const { container } = render(<Icon path="M5 10h14" />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("w-5 h-5");
  });

  it("debe permitir className personalizado", () => {
    const { container } = render(
      <Icon path="M5 10h14" className="w-10 h-10 text-red-500" />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("w-10 h-10 text-red-500");
  });

  it("debe pasar propiedades SVG adicionales", () => {
    const { container } = render(
      <Icon
        path="M5 10h14"
        data-testid="custom-icon"
        aria-label="Icono personalizado"
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("data-testid", "custom-icon");
    expect(svg).toHaveAttribute("aria-label", "Icono personalizado");
  });

  it("debe renderizar icono EYE", () => {
    const { container } = render(<Icon path={ICONS.EYE} />);

    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(2);
  });

  it("debe renderizar icono TRASH", () => {
    const { container } = render(<Icon path={ICONS.TRASH} />);

    const path = container.querySelector("path");
    expect(path).toHaveAttribute("d", ICONS.TRASH);
  });

  it("debe renderizar icono CHEVRON_LEFT", () => {
    const { container } = render(<Icon path={ICONS.CHEVRON_LEFT} />);

    const path = container.querySelector("path");
    expect(path).toHaveAttribute("d", ICONS.CHEVRON_LEFT);
  });

  it("debe aplicar strokeLinecap redondeado", () => {
    const { container } = render(<Icon path="M5 10h14" />);

    const path = container.querySelector("path");
    expect(path).toHaveAttribute("stroke-linecap", "round");
  });

  it("debe aplicar strokeLinejoin redondeado", () => {
    const { container } = render(<Icon path="M5 10h14" />);

    const path = container.querySelector("path");
    expect(path).toHaveAttribute("stroke-linejoin", "round");
  });

  it("debe renderizar con diferentes tamaños", () => {
    const sizes = ["w-4 h-4", "w-6 h-6", "w-8 h-8"];

    sizes.forEach((size) => {
      const { container } = render(<Icon path="M5 10h14" className={size} />);

      const svg = container.querySelector("svg");
      const classes = size.split(" ");
      classes.forEach((cls) => {
        expect(svg).toHaveClass(cls);
      });
    });
  });

  it("debe funcionar con color del texto", () => {
    const colors = ["text-red-500", "text-blue-600", "text-green-700"];

    colors.forEach((color) => {
      const { container } = render(<Icon path="M5 10h14" className={color} />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveClass(color);
    });
  });

  it("debe renderizar sin error cuando path es string vacío", () => {
    const { container } = render(<Icon path="" />);

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("debe aplicar reglas de fill y clip para solid", () => {
    const { container } = render(<Icon path="M5 10h14" solid={true} />);

    const path = container.querySelector("path");
    expect(path).toHaveAttribute("fill-rule", "evenodd");
    expect(path).toHaveAttribute("clip-rule", "evenodd");
  });

  it("no debe aplicar reglas de fill y clip para outline", () => {
    const { container } = render(<Icon path="M5 10h14" solid={false} />);

    const path = container.querySelector("path");
    expect(path).not.toHaveAttribute("fill-rule");
    expect(path).not.toHaveAttribute("clip-rule");
  });
});
