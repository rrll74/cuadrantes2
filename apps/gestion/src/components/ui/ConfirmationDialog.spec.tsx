import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ConfirmationDialog } from "./ConfirmationDialog";

describe("ConfirmationDialog Component", () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    isOpen: true,
    title: "Confirmar acción",
    message: "¿Estás seguro?",
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("debe renderizarse correctamente cuando isOpen es true", () => {
    render(<ConfirmationDialog {...defaultProps} />);

    // Avanzamos los timers para que se ejecute el useEffect y la animación de entrada
    act(() => {
      jest.runAllTimers();
    });

    expect(screen.getByText("Confirmar acción")).toBeInTheDocument();
    expect(screen.getByText("¿Estás seguro?")).toBeInTheDocument();
  });

  it("no debe renderizarse cuando isOpen es false", () => {
    render(<ConfirmationDialog {...defaultProps} isOpen={false} />);

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.queryByText("Confirmar acción")).not.toBeInTheDocument();
  });

  it("debe llamar a onConfirm al hacer clic en el botón de confirmar", () => {
    render(<ConfirmationDialog {...defaultProps} />);

    act(() => {
      jest.runAllTimers();
    });

    const confirmButton = screen.getByText("Eliminar");
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it("debe llamar a onCancel al hacer clic en el botón de cancelar", () => {
    render(<ConfirmationDialog {...defaultProps} />);

    act(() => {
      jest.runAllTimers();
    });

    const cancelButton = screen.getByText("Cancelar");
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("debe mostrar estado de carga y deshabilitar botones", () => {
    render(<ConfirmationDialog {...defaultProps} isLoading={true} />);

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.getByText("Eliminando...")).toBeInTheDocument();
    expect(screen.getByText("Eliminando...")).toBeDisabled();
    expect(screen.getByText("Cancelar")).toBeDisabled();
  });
});
