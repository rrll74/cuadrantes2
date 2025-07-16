"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Button,
  TextField,
  Container,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function LoginPage() {
  const { register, handleSubmit } = useForm();
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: unknown) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", data);
      const { access_token } = response.data;
      login(access_token);
      router.push("/dashboard"); // Redirige al dashboard después del login
    } catch (err) {
      setError(
        "Usuario o contraseña incorrectos. Por favor, inténtelo de nuevo."
      );
      console.error("Fallo en el login", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography component="h1" variant="h5">
          Iniciar Sesión
        </Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Nombre de Usuario"
            autoFocus
            {...register("username")}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Contraseña"
            type="password"
            id="password"
            {...register("password")}
          />
          {error && (
            <Alert severity="error" sx={{ width: "100%", mt: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : "Acceder"}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
