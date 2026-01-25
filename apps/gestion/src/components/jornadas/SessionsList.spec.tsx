import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SessionsList } from "./SessionsList";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

// Mock de las dependencias externas
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/usePermissions", () => ({
  usePermissions: jest.fn(),
}));

jest.mock("@/lib/api", () => ({
  delete: jest.fn(),
  get: jest.fn(),
}));

jest.mock("@/components/ui/ConfirmationDialog", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ConfirmationDialog: ({ isOpen, onConfirm, onCancel }: any) =>
    isOpen ? (
      <div role="dialog">
        <button onClick={onConfirm}>Confirmar</button>
        <button onClick={onCancel}>Cancelar</button>
      </div>
    ) : null,
}));

// Mock de Next/Link para evitar errores de renderizado fuera del router
jest.mock("next/link", () => {
  // eslint-disable-next-line react/display-name, @typescript-eslint/no-explicit-any
  return ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
});

describe("SessionsList Component", () => {
  const mockMutateAsync = jest.fn();
  const mockInvalidateQueries = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Configuración por defecto de los mocks
    (useAuth as jest.Mock).mockReturnValue({
      user: { userId: 1, username: "testuser" },
    });

    (useQueryClient as jest.Mock).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });

    // Simulamos que useMutation devuelve nuestra función mockeada
    (useMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
    });

    // Mockear permisos para que devuelva true por defecto
    (usePermissions as jest.Mock).mockReturnValue(true);
  });

  it("debe llamar a la función de borrado cuando el usuario confirma", async () => {
    // 1. Mockear datos de la sesión para que se renderice una fila
    const mockSessions = [
      {
        id: 101,
        createdAt: "2023-10-27T10:00:00Z",
        totalRutas: 10,
        totalResultados: 10,
      },
    ];

    (useQuery as jest.Mock).mockReturnValue({
      data: mockSessions,
      isLoading: false,
      isError: false,
    });

    // 3. Renderizar el componente
    render(<SessionsList />);

    // 4. Buscar el botón de eliminar y hacer clic
    const deleteButton = screen.getByLabelText("Eliminar sesión");
    fireEvent.click(deleteButton);

    // 5. Confirmar en el diálogo
    const confirmButton = screen.getByText("Confirmar");
    fireEvent.click(confirmButton);

    // 6. Verificar que se llamó a la mutación con el ID correcto
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(101);
    });

    // 7. Verificar que aparece el Toast de éxito
    expect(
      await screen.findByText("Sesión eliminada correctamente."),
    ).toBeInTheDocument();
  });

  it("NO debe llamar a la función de borrado si el usuario cancela", async () => {
    const mockSessions = [
      { id: 102, createdAt: "", totalRutas: 0, totalResultados: 0 },
    ];

    (useQuery as jest.Mock).mockReturnValue({
      data: mockSessions,
      isLoading: false,
      isError: false,
    });

    render(<SessionsList />);
    fireEvent.click(screen.getByLabelText("Eliminar sesión"));

    const cancelButton = screen.getByText("Cancelar");
    fireEvent.click(cancelButton);

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
