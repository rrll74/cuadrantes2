"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
// Importaciones de Material-UI
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Box,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControlLabel,
  Switch,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import api from "@/lib/api";
import { User } from "@/types/user";
import { usePermissions } from "@/hooks/usePermissions";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import UserForm from "@/app/dashboard/users/components/userForm";
import { UserRow } from "@/app/dashboard/users/components/UserRow";
import { useUserHandlers } from "./components/userHandlers";
import { useSocket } from "@/context/SocketContext";
import { PERMISSIONS } from "@cuadrantes/shared-dto";

// Función para obtener los datos (sin cambios)
const fetchUsers = async (): Promise<User[]> => {
  const { data } = await api.get("/users");
  return data;
};

const fetchLockdownStatus = async (): Promise<{ isLocked: boolean }> => {
  const { data } = await api.get("/auth/lockdown-status");
  return data;
};

export default function UsersListPage() {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const {
    isFormOpen,
    editingUser,
    isConfirmOpen,
    userMutation,
    deleteMutation,
    handleOpenCreateForm,
    handleOpenEditForm,
    handleOpenDeleteConfirm,
    handleCloseForm,
    handleFormSubmit,
    handleCloseConfirm,
    handleDeleteConfirm,
  } = useUserHandlers();

  // Permisos
  const canRead = usePermissions(PERMISSIONS.USERS_READ);
  const canCreate = usePermissions(PERMISSIONS.USERS_CREATE);
  const canUpdate = usePermissions(PERMISSIONS.USERS_UPDATE); // Usaremos este permiso también para desconectar
  const canDelete = usePermissions(PERMISSIONS.USERS_DELETE);

  const {
    data: users,
    isLoading,
    isError,
    error,
  } = useQuery<User[], Error>({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: canRead,
  });

  const { data: lockdownStatus } = useQuery<{ isLocked: boolean }>({
    queryKey: ["lockdownStatus"],
    queryFn: fetchLockdownStatus,
    enabled: canUpdate, // Solo los admins necesitan saber esto
  });

  const toggleLockdownMutation = useMutation({
    mutationFn: () => api.post("/auth/toggle-lockdown"),
    onSuccess: () => {
      // Refresca el estado del interruptor después de cambiarlo
      queryClient.invalidateQueries({ queryKey: ["lockdownStatus"] });
    },
  });

  const handleDisconnectUser = (userId: number) => {
    if (!socket) {
      console.error(
        "Socket no está conectado. No se puede desconectar al usuario.",
      );
      return;
    }
    console.log(
      `Enviando petición para forzar desconexión del usuario: ${userId}`,
    );
    socket.emit("admin:disconnect_user", { userId });
  };

  useEffect(() => {
    if (!socket) return;

    // Función genérica para actualizar el estado de conexión en el caché de React Query
    const handleStatusUpdate = (
      event: "user:connected" | "user:disconnected",
      data: { userId: number },
    ) => {
      console.log(`Evento recibido: ${event}`, data);
      queryClient.setQueryData(["users"], (oldData: User[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((user) =>
          user.id === data.userId
            ? { ...user, isConnected: event === "user:connected" }
            : user,
        );
      });
    };

    socket.on("connect", () => {
      console.log("Conectado al servidor de WebSockets con ID:", socket.id);
    });

    // Escuchamos los eventos del backend
    socket.on("user:connected", (data: { userId: number }) =>
      handleStatusUpdate("user:connected", data),
    );
    socket.on("user:disconnected", (data: { userId: number }) =>
      handleStatusUpdate("user:disconnected", data),
    );

    // Limpieza: nos aseguramos de desconectar el socket cuando el componente se desmonte
    return () => {
      socket.off("connect");
      socket.off("user:connected");
      socket.off("user:disconnected");
    };
  }, [socket, queryClient]); // El efecto se re-ejecutará si el socket cambia

  if (!canRead && !canCreate && !canUpdate && !canDelete)
    return (
      <Alert severity="error">No tienes permiso para ver esta página.</Alert>
    );

  // Estado de carga con un componente de MUI
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Estado de error con un componente de MUI
  if (isError) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          Error al cargar los usuarios: {error.message}
        </Alert>
      </Container>
    );
  }

  // Renderizado de la tabla con componentes de MUI
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Lista de Usuarios
      </Typography>
      <Box>
        {canCreate && (
          <Button startIcon={<AddIcon />} onClick={handleOpenCreateForm}>
            Crear Usuario
          </Button>
        )}
        {canUpdate && (
          <FormControlLabel
            control={
              <Switch
                checked={lockdownStatus?.isLocked ?? false}
                onChange={() => toggleLockdownMutation.mutate()}
                color="warning"
              />
            }
            label="Bloquear nuevos inicios de sesión"
          />
        )}
      </Box>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead sx={{ backgroundColor: "grey.200" }}>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Conexión</TableCell>
              <TableCell>Permisos</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id} hover>
                <UserRow
                  canDelete={canDelete && user.username !== "admin"}
                  canUpdate={canUpdate}
                  user={user}
                  onEdit={handleOpenEditForm}
                  onDelete={handleOpenDeleteConfirm}
                  canDisconnect={canUpdate}
                  onDisconnect={handleDisconnectUser}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={isFormOpen} onClose={handleCloseForm}>
        <DialogTitle>
          {editingUser ? "Editar Usuario" : "Crear Usuario"}
        </DialogTitle>
        <DialogContent>
          <UserForm
            onSubmit={handleFormSubmit}
            initialData={editingUser}
            isSubmitting={userMutation.isPending}
            isSuccess={userMutation.isSuccess}
            isEdit={!!editingUser}
            onClose={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={isConfirmOpen}
        onClose={handleCloseConfirm}
        onConfirm={handleDeleteConfirm}
        title="Confirmar Eliminación"
        description="¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer."
        isSubmitting={deleteMutation.isPending}
      />
    </Container>
  );
}
