"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  Divider,
  Collapse,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Button,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import CalendarIcon from "@mui/icons-material/CalendarToday";
import DescriptionIcon from "@mui/icons-material/Description";
import EventNoteIcon from "@mui/icons-material/EventNote";
import CalculateIcon from "@mui/icons-material/Calculate";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import EngineeringIcon from "@mui/icons-material/Engineering";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePermissions } from "@/hooks/usePermissions";
import { SocketProvider } from "@/context/SocketContext";
import { PERMISSIONS } from "@cuadrantes/shared-dto";
import AccountSettingsDialog from "@/components/user-settings/AccountSettingsDialog";

const drawerWidth = 240;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const router = useRouter();
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [generalExpanded, setGeneralExpanded] = useState(true);
  const [rsuExpanded, setRsuExpanded] = useState(true);
  const [serviciosExpanded, setServiciosExpanded] = useState(true);
  const isAdmin = usePermissions(PERMISSIONS.ADMIN);
  const canReadUsers = usePermissions(PERMISSIONS.USERS_READ) || isAdmin;
  const canCreateUsers = usePermissions(PERMISSIONS.USERS_CREATE) || isAdmin;
  const canUpdateUsers = usePermissions(PERMISSIONS.USERS_UPDATE) || isAdmin;
  const canDeleteUsers = usePermissions(PERMISSIONS.USERS_DELETE) || isAdmin;
  const canCRUD =
    canReadUsers || canCreateUsers || canUpdateUsers || canDeleteUsers;
  const canReadJornadas = usePermissions(PERMISSIONS.JORNADAS_READ);
  const showJornadas = canReadJornadas || isAdmin;
  const canGenerarPartesTrabajo =
    usePermissions(PERMISSIONS.PARTES_TRABAJO_WRITE) || isAdmin;
  const canReadCuadrantes =
    usePermissions(PERMISSIONS.CUADRANTES_READ) || isAdmin;
  const canDistribuirPresupuesto =
    usePermissions(PERMISSIONS.PRESUPUESTO_DISTRIBUCION) || isAdmin;
  const showRsuSection = showJornadas;
  const showServiciosSection =
    canGenerarPartesTrabajo || canReadCuadrantes || canDistribuirPresupuesto;

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

  const handleOpenSettingsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleCloseSettingsMenu = () => {
    setSettingsAnchorEl(null);
  };

  const handleOpenAccountDialog = () => {
    setIsAccountDialogOpen(true);
    handleCloseSettingsMenu();
  };

  const handleCloseAccountDialog = () => {
    setIsAccountDialogOpen(false);
  };

  // TODO: Crear un submenú  para la consulta de cuadrantes que permita realizar acceso a la actual consulta de cuadrantes y a un nuevo apartado de consulta de cuadrantes históricos, análogo al que se ha hecho para el que ya existe, pero que el primer dato solicitado sea el cuadrante a consultar, y el periodo a consultar, con un selector de fechas, esto desplegará un selector con todos los trabajadores que hayan tenido puesto en ese cuadrante durante ese periodo, y al seleccionar el trabajador se mostrarán los cuadrantes que ha tenido durante ese periodo, con la posibilidad de descargar cada uno de ellos en PDF, y que puedan seleccionarse todos o sólo parte de ellos, o de descargarlos todos juntos en un ZIP, con el mismo formato que el PDF generado en la consulta de cuadrantes actual. También debe poderse enviar individualmente por correo electrónico a cada trabajador seleccionado, en caso de que tenga correo electrónico registrado. Además, se podría añadir un nuevo permiso específico para esta funcionalidad, para que solo ciertos usuarios puedan acceder a ella.

  // TODO: Crear un nuevo apartado en el menú lateral para la gestión de cuadrantes, que permita a los usuarios con permisos adecuados crear, editar y eliminar cuadrantes. Este apartado debería incluir un formulario para crear y editar cuadrantes, que permita seleccionar los trabajadores asignados a cada puesto, así como las fechas de inicio y fin de cada cuadrante. Además, debería incluir una vista de lista o calendario para visualizar los cuadrantes existentes, con opciones para filtrarlos por trabajador, fecha o puesto. También se podría añadir la funcionalidad de arrastrar y soltar para facilitar la asignación de trabajadores a los puestos en el calendario. Este apartado debería tener su propio permiso específico para controlar el acceso a esta funcionalidad.

  return (
    <Box sx={{ display: "flex" }}>
      <ProtectedRoute>
        <SocketProvider>
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
              <IconButton
                color="inherit"
                aria-label="Configuración de cuenta"
                onClick={handleOpenSettingsMenu}
              >
                <SettingsIcon />
              </IconButton>
              <Menu
                anchorEl={settingsAnchorEl}
                open={Boolean(settingsAnchorEl)}
                onClose={handleCloseSettingsMenu}
              >
                <MenuItem onClick={handleOpenAccountDialog}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  {user?.username || "Usuario"}
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Cerrar sesión
                </MenuItem>
              </Menu>
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
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => setGeneralExpanded((prev) => !prev)}
                  >
                    <ListItemIcon>
                      <TuneIcon />
                    </ListItemIcon>
                    <ListItemText primary="General" />
                    {generalExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={generalExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {canCRUD && (
                      <ListItem disablePadding>
                        <ListItemButton
                          component={Link}
                          href="/dashboard/users"
                          sx={{ pl: 4 }}
                        >
                          <ListItemIcon>
                            <PeopleIcon />
                          </ListItemIcon>
                          <ListItemText primary="Gestión de Usuarios" />
                        </ListItemButton>
                      </ListItem>
                    )}
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={handleOpenAccountDialog}
                        sx={{ pl: 4 }}
                      >
                        <ListItemIcon>
                          <SettingsIcon />
                        </ListItemIcon>
                        <ListItemText primary="Configuración de Cuenta" />
                      </ListItemButton>
                    </ListItem>
                  </List>
                </Collapse>

                <Divider sx={{ my: 1 }} />

                {showRsuSection && (
                  <>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => setRsuExpanded((prev) => !prev)}
                      >
                        <ListItemIcon>
                          <AssignmentTurnedInIcon />
                        </ListItemIcon>
                        <ListItemText primary="RSU" />
                        {rsuExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </ListItemButton>
                    </ListItem>
                    <Collapse in={rsuExpanded} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {showJornadas && (
                          <ListItem disablePadding>
                            <ListItemButton
                              component={Link}
                              href="/dashboard/jornadas"
                              sx={{ pl: 4 }}
                            >
                              <ListItemIcon>
                                <CalendarIcon />
                              </ListItemIcon>
                              <ListItemText primary="Comprobación de jornadas" />
                            </ListItemButton>
                          </ListItem>
                        )}
                      </List>
                    </Collapse>
                    <Divider sx={{ my: 1 }} />
                  </>
                )}

                {showServiciosSection && (
                  <>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => setServiciosExpanded((prev) => !prev)}
                      >
                        <ListItemIcon>
                          <EngineeringIcon />
                        </ListItemIcon>
                        <ListItemText primary="Servicios Operativos" />
                        {serviciosExpanded ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )}
                      </ListItemButton>
                    </ListItem>
                    <Collapse
                      in={serviciosExpanded}
                      timeout="auto"
                      unmountOnExit
                    >
                      <List component="div" disablePadding>
                        {canGenerarPartesTrabajo && (
                          <ListItem disablePadding>
                            <ListItemButton
                              component={Link}
                              href="/dashboard/generar-parte-trabajo"
                              sx={{ pl: 4 }}
                            >
                              <ListItemIcon>
                                <DescriptionIcon />
                              </ListItemIcon>
                              <ListItemText primary="Generar Orden de Trabajo" />
                            </ListItemButton>
                          </ListItem>
                        )}

                        {canReadCuadrantes && (
                          <ListItem disablePadding>
                            <ListItemButton
                              component={Link}
                              href="/dashboard/consulta-cuadrantes"
                              sx={{ pl: 4 }}
                            >
                              <ListItemIcon>
                                <EventNoteIcon />
                              </ListItemIcon>
                              <ListItemText primary="Consulta de Cuadrantes" />
                            </ListItemButton>
                          </ListItem>
                        )}

                        {canDistribuirPresupuesto && (
                          <ListItem disablePadding>
                            <ListItemButton
                              component={Link}
                              href="/dashboard/dist-aut-presupuesto"
                              sx={{ pl: 4 }}
                            >
                              <ListItemIcon>
                                <CalculateIcon />
                              </ListItemIcon>
                              <ListItemText primary="Distribución de Presupuesto" />
                            </ListItemButton>
                          </ListItem>
                        )}
                      </List>
                    </Collapse>
                  </>
                )}
              </List>
            </Box>
          </Drawer>

          {/* Contenido Principal de la Página */}
          <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
            <Toolbar />
            {children}
          </Box>
          <AccountSettingsDialog
            open={isAccountDialogOpen}
            onClose={handleCloseAccountDialog}
          />
        </SocketProvider>
      </ProtectedRoute>
    </Box>
  );
}
