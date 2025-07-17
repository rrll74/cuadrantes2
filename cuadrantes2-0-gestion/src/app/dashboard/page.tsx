"use client";

import { Typography, Container, Paper, Box } from "@mui/material";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          ¡Bienvenido, {user?.username}!
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Typography variant="body1">
            Has iniciado sesión correctamente en el panel de gestión. Utiliza el
            menú de navegación para acceder a las diferentes secciones de la
            aplicación.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}
