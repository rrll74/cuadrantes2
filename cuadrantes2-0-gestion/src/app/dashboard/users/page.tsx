"use client";

import { useQuery } from "@tanstack/react-query";
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import api from "@/lib/api";
import { User } from "@/types/user";
import { usePermissions } from "@/hooks/usePermissions";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import UserForm from "@/app/dashboard/users/components/userForm";
import { UserRow } from "@/app/dashboard/users/components/UserRow";
import { useUserHandlers } from "./components/userHandlers";

// Función para obtener los datos (sin cambios)
const fetchUsers = async (): Promise<User[]> => {
  const { data } = await api.get("/users");
  return data;
};

export default function UsersListPage() {
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
  const canRead = usePermissions("users:read");
  const canCreate = usePermissions("users:create");
  const canUpdate = usePermissions("users:update");
  const canDelete = usePermissions("users:delete");

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

  if (!canRead)
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
      </Box>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead sx={{ backgroundColor: "grey.200" }}>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell align="center">Estado</TableCell>
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
