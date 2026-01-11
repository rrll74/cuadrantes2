import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tooltip } from "./Tooltip";

describe("Tooltip Component", () => {
  it("debe mostrar el tooltip al hacer hover", () => {
    render(
      <Tooltip content="Texto de ayuda">
        <button>Acción</button>
      </Tooltip>,
    );

    const trigger = screen.getByText("Acción");
    // El evento onMouseEnter está en el div contenedor
    const container = trigger.parentElement;

    // Verificar que inicialmente no está visible
    expect(screen.queryByText("Texto de ayuda")).not.toBeInTheDocument();

    // Simular entrada del ratón
    if (container) {
      fireEvent.mouseEnter(container);
    }
    expect(screen.getByText("Texto de ayuda")).toBeInTheDocument();

    // Simular salida del ratón
    if (container) {
      fireEvent.mouseLeave(container);
    }
    expect(screen.queryByText("Texto de ayuda")).not.toBeInTheDocument();
  });

  it("debe mostrar el tooltip al recibir foco (accesibilidad)", () => {
    render(
      <Tooltip content="Texto de ayuda">
        <button>Acción</button>
      </Tooltip>,
    );

    const trigger = screen.getByText("Acción");

    // Verificar que inicialmente no está visible
    expect(screen.queryByText("Texto de ayuda")).not.toBeInTheDocument();

    // Simular foco en el elemento interactivo (el evento burbujea al contenedor)
    fireEvent.focus(trigger);
    expect(screen.getByText("Texto de ayuda")).toBeInTheDocument();

    // Simular pérdida de foco
    fireEvent.blur(trigger);
    expect(screen.queryByText("Texto de ayuda")).not.toBeInTheDocument();
  });
});
