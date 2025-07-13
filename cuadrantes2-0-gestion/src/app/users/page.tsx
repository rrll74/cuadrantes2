"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "@/lib/api";
import { User } from "@/types/user";
import { usePermissions } from "@/hooks/usePermissions";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import UserForm from "@/components/userForm";

// Función para obtener los datos (sin cambios)
const fetchUsers = async (): Promise<User[]> => {
  const { data } = await api.get("/users");
  return data;
};

export default function UsersListPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

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

  // Mutación para crear/actualizar usuario
  const userMutation = useMutation({
    mutationFn: (userData: unknown) =>
      editingUser
        ? api.patch(`/users/${editingUser.id}`, userData)
        : api.post("/users", userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsFormOpen(false);
    },
  });

  // Mutación para eliminar usuario
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsConfirmOpen(false);
    },
  });

  // Handlers para abrir/cerrar dialogs
  const handleOpenCreateForm = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleOpenDeleteConfirm = (id: number) => {
    setDeletingUserId(id);
    setIsConfirmOpen(true);
  };

  const handleFormSubmit = (data: unknown) => {
    userMutation.mutate(data);
  };

  const handleDeleteConfirm = () => {
    if (deletingUserId) {
      deleteMutation.mutate(deletingUserId);
    }
  };

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
                <TableCell component="th" scope="row">
                  {user.id}
                </TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell align="center">
                  {user.banned ? (
                    <Chip label="Baneado" color="error" size="small" />
                  ) : user.activated ? (
                    <Chip label="Activo" color="success" size="small" />
                  ) : (
                    <Chip label="Inactivo" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {user.permisos.map((permiso) => (
                      <Chip
                        key={permiso.id}
                        label={permiso.tipo}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  {canUpdate && (
                    <IconButton onClick={() => handleOpenEditForm(user)}>
                      <EditIcon />
                    </IconButton>
                  )}
                  {canDelete && (
                    <IconButton
                      onClick={() => handleOpenDeleteConfirm(user.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={isFormOpen} onClose={() => setIsFormOpen(false)}>
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
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirmar Eliminación"
        description="¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer."
        isSubmitting={deleteMutation.isPending}
      />
    </Container>
  );
}
