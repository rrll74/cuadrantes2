"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Button,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

const drawerWidth = 240;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si no está cargando y el usuario no está autenticado, lo echamos al login.
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Mientras se verifica el estado de autenticación, mostramos un spinner.
  if (isLoading || !isAuthenticated) {
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

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <Box sx={{ display: "flex" }}>
      <ProtectedRoute>
        {/* Barra de Navegación Superior */}
        <AppBar
          position="fixed"
          sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
        >
          <Toolbar>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ flexGrow: 1 }}
            >
              Panel de Gestión
            </Typography>
            <Button color="inherit" component={Link} href="/dashboard">
              <HomeIcon />
              Inicio
            </Button>
            <Button color="inherit" onClick={handleLogout}>
              Cerrar Sesión
            </Button>
          </Toolbar>
        </AppBar>

        {/* Menú Lateral Persistente */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: "auto" }}>
            <List>
              {/* Enlace a la gestión de usuarios */}
              <ListItem disablePadding>
                <ListItemButton component={Link} href="/dashboard/users">
                  <ListItemIcon>
                    <PeopleIcon />
                  </ListItemIcon>
                  <ListItemText primary="Gestión de Usuarios" />
                </ListItemButton>
              </ListItem>
              {/* Aquí puedes añadir más enlaces a otras secciones */}
            </List>
          </Box>
        </Drawer>

        {/* Contenido Principal de la Página */}
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          {children}
        </Box>
      </ProtectedRoute>
    </Box>
  );
}
