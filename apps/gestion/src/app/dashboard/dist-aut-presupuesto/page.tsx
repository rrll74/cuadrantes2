"use client";

import { Alert, Box, Paper, Typography } from "@mui/material";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@cuadrantes/shared-dto";
import { DistribucionPresupuestoForm } from "./components/DistribucionPresupuestoForm";

export default function DistribucionPresupuestoPage() {
  const canAccess = usePermissions(PERMISSIONS.PRESUPUESTO_DISTRIBUCION);
  const isAdmin = usePermissions(PERMISSIONS.ADMIN);
  const hasAccess = canAccess || isAdmin;

  if (!hasAccess) {
    return (
      <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f5f5", py: 10 }}>
        <Box sx={{ mx: "auto", maxWidth: 1200, px: 3 }}>
          <Alert severity="error">
            No tienes permisos para acceder a esta sección.
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f5f5", py: 10 }}>
      <Box sx={{ mx: "auto", maxWidth: 1200, px: 3 }}>
        <Paper sx={{ p: 4, borderRadius: 3 }} elevation={1}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Distribución automática de presupuesto
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, color: "text.secondary" }}>
            Sube un Excel con materiales y define el presupuesto objetivo para
            generar el reparto automático.
          </Typography>
          <Alert severity="info" sx={{ mt: 3 }}>
            Ya puedes validar un fichero Excel y revisar sus materiales antes de
            pasar a la fase de cálculo y exportación.
          </Alert>
        </Paper>

        <Box sx={{ mt: 4 }}>
          <DistribucionPresupuestoForm />
        </Box>
      </Box>
    </Box>
  );
}
