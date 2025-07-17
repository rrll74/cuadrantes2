import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { User } from "@/types/user";

export const useUserHandlers = () => {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  // Mutación para crear/actualizar usuario
  const userMutation = useMutation({
    mutationFn: (userData: unknown) =>
      editingUser
        ? api.patch(`/users/${editingUser.id}`, userData)
        : api.post("/users", userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsFormOpen(false);
      setEditingUser(null);
    },
  });

  // Mutación para eliminar usuario
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsConfirmOpen(false);
      setDeletingUserId(null);
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

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
  };

  const handleCloseConfirm = () => {
    setIsConfirmOpen(false);
    setDeletingUserId(null);
  };

  const handleFormSubmit = (data: unknown) => {
    userMutation.mutate(data);
  };

  const handleDeleteConfirm = () => {
    if (deletingUserId) {
      deleteMutation.mutate(deletingUserId);
    }
  };

  return {
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
  };
};
