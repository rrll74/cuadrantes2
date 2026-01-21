import { renderHook } from "@testing-library/react";
import { usePermissions } from "./usePermissions";
import { useAuth } from "@/context/AuthContext";

jest.mock("@/context/AuthContext");

describe("usePermissions Hook", () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe retornar true si usuario tiene permisos", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "1",
        username: "admin",
        email: "admin@test.com",
        permisos: ["admin", "users:read", "users:create"],
      },
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
    } as any);

    const { result } = renderHook(() => usePermissions("admin"));
    expect(result.current).toBe(true);
  });

  it("debe retornar true si usuario tiene permiso específico", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "1",
        username: "usuario",
        email: "user@test.com",
        permisos: ["jornadas:read", "jornadas:write"],
      },
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
    } as any);

    const { result } = renderHook(() => usePermissions("jornadas:read"));
    expect(result.current).toBe(true);
  });

  it("debe retornar false si usuario no tiene permiso", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "2",
        username: "usuario",
        email: "user@test.com",
        permisos: ["jornadas:read"],
      },
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
    } as any);

    const { result } = renderHook(() => usePermissions("users:delete"));
    expect(result.current).toBe(false);
  });

  it("debe retornar false si usuario es null", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: false,
    } as any);

    const { result } = renderHook(() => usePermissions("admin"));
    expect(result.current).toBe(false);
  });

  it("debe retornar false si usuario no tiene permisos array", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "3",
        username: "usuario",
        email: "user@test.com",
        permisos: undefined,
      },
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
    } as any);

    const { result } = renderHook(() => usePermissions("admin"));
    expect(result.current).toBe(false);
  });

  it("debe manejar múltiples permisos solicitados", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "1",
        username: "admin",
        email: "admin@test.com",
        permisos: ["admin", "users:read", "users:create", "jornadas:read"],
      },
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
    } as any);

    const { result: adminResult } = renderHook(() => usePermissions("admin"));
    expect(adminResult.current).toBe(true);

    const { result: usersResult } = renderHook(() =>
      usePermissions("users:create"),
    );
    expect(usersResult.current).toBe(true);

    const { result: noAccessResult } = renderHook(() =>
      usePermissions("users:delete"),
    );
    expect(noAccessResult.current).toBe(false);
  });

  it("debe ser case-sensitive", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "1",
        username: "usuario",
        email: "user@test.com",
        permisos: ["Admin"],
      },
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
    } as any);

    const { result: lowerResult } = renderHook(() => usePermissions("admin"));
    expect(lowerResult.current).toBe(false);

    const { result: upperResult } = renderHook(() => usePermissions("Admin"));
    expect(upperResult.current).toBe(true);
  });

  it("debe manejar permisos vacíos", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "1",
        username: "usuario",
        email: "user@test.com",
        permisos: [],
      },
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
    } as any);

    const { result } = renderHook(() => usePermissions("admin"));
    expect(result.current).toBe(false);
  });

  it("debe manejar permiso vacío solicitado", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "1",
        username: "admin",
        email: "admin@test.com",
        permisos: ["admin", "users:read"],
      },
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
    } as any);

    const { result } = renderHook(() => usePermissions(""));
    expect(result.current).toBe(false);
  });

  it("debe actualizar cuando permiso cambia", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "1",
        username: "usuario",
        email: "user@test.com",
        permisos: ["jornadas:read"],
      },
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
    } as any);

    const { result, rerender } = renderHook(
      ({ permission }) => usePermissions(permission),
      { initialProps: { permission: "jornadas:read" } },
    );

    expect(result.current).toBe(true);

    rerender({ permission: "users:delete" });
    expect(result.current).toBe(false);
  });

  it("debe actualizar cuando usuario cambia", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "1",
        username: "usuario1",
        email: "user1@test.com",
        permisos: ["admin"],
      },
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
    } as any);

    const { result, rerender } = renderHook(() => usePermissions("admin"));
    expect(result.current).toBe(true);

    // Simular cambio de usuario
    mockUseAuth.mockReturnValue({
      user: {
        id: "2",
        username: "usuario2",
        email: "user2@test.com",
        permisos: ["jornadas:read"],
      },
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
    } as any);

    rerender();
    expect(result.current).toBe(false);
  });

  it("debe manejar permisos con dos puntos", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "1",
        username: "usuario",
        email: "user@test.com",
        permisos: ["jornadas:read", "jornadas:write", "users:read:all"],
      },
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
    } as any);

    const { result } = renderHook(() => usePermissions("users:read:all"));
    expect(result.current).toBe(true);
  });

  it("debe retornar false si permiso no es exacto", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "1",
        username: "usuario",
        email: "user@test.com",
        permisos: ["jornadas:read"],
      },
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
    } as any);

    const { result } = renderHook(() => usePermissions("jornadas"));
    expect(result.current).toBe(false);
  });
});
