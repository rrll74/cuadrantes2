"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface AccountSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface SelfUserResponse {
  id: number;
  username: string;
  email: string;
}

export const AccountSettingsDialog = ({
  open,
  onClose,
}: AccountSettingsDialogProps) => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccess(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      return;
    }

    const fetchProfile = async () => {
      setLoadingProfile(true);
      setError(null);
      try {
        const { data } = await api.get<SelfUserResponse>("/users/me");
        setEmail(data.email || "");
        setInitialEmail(data.email || "");
      } catch (err) {
        console.error("Error al cargar los datos del usuario:", err);
        setError("No se pudo cargar el perfil del usuario.");
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [open]);

  const resolveErrorMessage = (err: unknown) => {
    if (typeof err === "object" && err !== null && "response" in err) {
      const response = (err as { response?: { data?: unknown } }).response;
      const message = response?.data as
        | { message?: string | string[] }
        | undefined;
      if (Array.isArray(message?.message)) {
        return message?.message.join(" ");
      }
      if (typeof message?.message === "string") {
        return message.message;
      }
    }
    return "No se pudo actualizar el perfil.";
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const hasEmailChange = trimmedEmail && trimmedEmail !== initialEmail;
    const hasPasswordChange = newPassword.trim().length > 0;

    if (!hasEmailChange && !hasPasswordChange) {
      setError("No hay cambios para guardar.");
      return;
    }

    if (!currentPassword.trim()) {
      setError("Debes indicar tu contraseña actual para guardar cambios.");
      return;
    }

    if (hasPasswordChange && newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    if (hasPasswordChange && newPassword.trim().length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setSaving(true);
    try {
      const payload: {
        email?: string;
        currentPassword: string;
        newPassword?: string;
      } = {
        currentPassword: currentPassword.trim(),
      };

      if (hasEmailChange) {
        payload.email = trimmedEmail;
      }

      if (hasPasswordChange) {
        payload.newPassword = newPassword.trim();
      }

      await api.patch("/users/me", payload);
      setSuccess("Tus datos se han actualizado correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (payload.email) {
        setInitialEmail(payload.email);
      }
    } catch (err) {
      setError(resolveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Configuración de cuenta</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Usuario: {user?.username || "-"}
          </Typography>
          {loadingProfile ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}
              <TextField
                label="Email"
                type="email"
                fullWidth
                margin="normal"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={saving}
              />
              <TextField
                label="Contraseña actual"
                type="password"
                fullWidth
                margin="normal"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={saving}
                autoComplete="current-password"
              />
              <TextField
                label="Nueva contraseña"
                type="password"
                fullWidth
                margin="normal"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={saving}
                autoComplete="new-password"
              />
              <TextField
                label="Confirmar nueva contraseña"
                type="password"
                fullWidth
                margin="normal"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={saving}
                autoComplete="new-password"
              />
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cerrar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || loadingProfile}
        >
          {saving ? <CircularProgress size={20} /> : "Guardar cambios"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountSettingsDialog;
