import { useAuth } from "@/context/AuthContext";

export const usePermissions = (requiredPermission: string): boolean => {
  const { user } = useAuth();
  if (!user || !user.permisos) {
    return false;
  }
  return user.permisos.includes(requiredPermission);
};
