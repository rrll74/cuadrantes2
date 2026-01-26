import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toast } from "./Toast";

// Mock timer
jest.useFakeTimers();

describe("Toast Component", () => {
  const onCloseMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it("debe renderizar mensaje de éxito correctamente", () => {
    render(
      <Toast
        message="Operación exitosa"
        type="success"
        onClose={onCloseMock}
      />,
    );

    expect(screen.getByText("Operación exitosa")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveClass("bg-green-600");
  });

  it("debe renderizar mensaje de error correctamente", () => {
    render(
      <Toast message="Operación fallida" type="error" onClose={onCloseMock} />,
    );

    expect(screen.getByText("Operación fallida")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveClass("bg-red-600");
  });

  it("debe tener color verde para tipo success", () => {
    const { container } = render(
      <Toast message="Éxito" type="success" onClose={onCloseMock} />,
    );

    const toast = container.querySelector('[role="alert"]');
    expect(toast).toHaveClass("bg-green-600");
  });

  it("debe tener color rojo para tipo error", () => {
    const { container } = render(
      <Toast message="Error" type="error" onClose={onCloseMock} />,
    );

    const toast = container.querySelector('[role="alert"]');
    expect(toast).toHaveClass("bg-red-600");
  });

  it("debe cerrar automáticamente después de 3 segundos", () => {
    render(
      <Toast message="Auto-cierre" type="success" onClose={onCloseMock} />,
    );

    expect(onCloseMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(3000);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("debe cerrar al hacer clic en el botón de cierre", () => {
    render(
      <Toast
        message="Click para cerrar"
        type="success"
        onClose={onCloseMock}
      />,
    );

    const closeButton = screen.getByRole("button", { name: /cerrar/i });
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("debe limpiar el timer cuando se desmonta", () => {
    const { unmount } = render(
      <Toast message="Test" type="success" onClose={onCloseMock} />,
    );

    unmount();

    jest.advanceTimersByTime(3000);

    // onClose no debe ser llamado porque el componente fue desmontado
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it("debe tener botón de cierre con accesibilidad", () => {
    render(<Toast message="Test" type="success" onClose={onCloseMock} />);

    const closeButton = screen.getByRole("button", { name: /cerrar/i });
    expect(closeButton).toHaveAttribute("aria-label", "Cerrar notificación");
  });

  it("debe renderizar icono de cerrar", () => {
    const { container } = render(
      <Toast message="Test" type="success" onClose={onCloseMock} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("debe tener estilos de posición fija", () => {
    const { container } = render(
      <Toast message="Test" type="success" onClose={onCloseMock} />,
    );

    const toast = container.querySelector('[role="alert"]');
    expect(toast).toHaveClass("fixed bottom-5 right-5 z-50");
  });

  it("debe tener estilos de transición", () => {
    const { container } = render(
      <Toast message="Test" type="success" onClose={onCloseMock} />,
    );

    const toast = container.querySelector('[role="alert"]');
    expect(toast).toHaveClass("transition-opacity duration-300");
  });

  it("debe renderizar múltiples toasts de manera independiente", () => {
    const onClose1 = jest.fn();
    const onClose2 = jest.fn();

    const { rerender } = render(
      <Toast message="Toast 1" type="success" onClose={onClose1} />,
    );

    expect(screen.getByText("Toast 1")).toBeInTheDocument();

    rerender(<Toast message="Toast 2" type="error" onClose={onClose2} />);

    expect(screen.getByText("Toast 2")).toBeInTheDocument();

    jest.advanceTimersByTime(3000);

    expect(onClose2).toHaveBeenCalled();
  });

  it("debe renderizar con diferentes longitudes de mensaje", () => {
    const shortMessage = "OK";
    const longMessage =
      "Este es un mensaje muy largo que describe una operación completada exitosamente";

    const { rerender } = render(
      <Toast message={shortMessage} type="success" onClose={onCloseMock} />,
    );

    expect(screen.getByText(shortMessage)).toBeInTheDocument();

    rerender(
      <Toast message={longMessage} type="success" onClose={onCloseMock} />,
    );

    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it("debe ser accesible con ARIA", () => {
    const { container } = render(
      <Toast message="Accessible toast" type="success" onClose={onCloseMock} />,
    );

    const toast = container.querySelector('[role="alert"]');
    expect(toast).toHaveAttribute("role", "alert");
  });
});
