/**
 * Permisos disponibles en la aplicación
 * Esta es la fuente única de verdad para todos los permisos
 * Se usa en:
 * - API: Decoradores @HasPermissions y @HasAnyPermission
 * - Seeding: Inicialización de permisos en la base de datos
 * - Frontend: usePermissions hook y contexto de autenticación
 */

export const AVAILABLE_PERMISSIONS = [
  {
    tipo: "admin",
    descripcion: "Permisos de administrador",
  },
  {
    tipo: "users:create",
    descripcion: "Crear usuarios",
  },
  {
    tipo: "users:read",
    descripcion: "Leer usuarios",
  },
  {
    tipo: "users:update",
    descripcion: "Actualizar usuarios",
  },
  {
    tipo: "users:delete",
    descripcion: "Eliminar usuarios",
  },
  {
    tipo: "jornadas:read",
    descripcion: "Jornadas: Leer",
  },
  {
    tipo: "jornadas:write",
    descripcion: "Jornadas: Escribir",
  },
] as const;

// Tipo derivado para garantizar type-safety
export type PermissionType = (typeof AVAILABLE_PERMISSIONS)[number]["tipo"];

// Objeto para acceder fácilmente a permisos individuales por nombre
export const PERMISSIONS = {
  ADMIN: "admin",
  USERS_CREATE: "users:create",
  USERS_READ: "users:read",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  JORNADAS_READ: "jornadas:read",
  JORNADAS_WRITE: "jornadas:write",
} as const satisfies Record<string, PermissionType>;
