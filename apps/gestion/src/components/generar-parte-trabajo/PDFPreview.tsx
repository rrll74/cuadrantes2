"use client";

import {
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  Paper,
} from "@mui/material";
import Logo from "@mui/icons-material/BusinessCenter";

interface ParteTrabajuData {
  fecha?: string;
  numeroDocumento?: string;
  tieneDocumentacion?: boolean;
  solicitante?: string;
  servicios?: string[];
  direccion?: string;
  descripcion?: string;
  observaciones?: string;
  fechaEjecucion?: string;
}

interface PDFPreviewProps {
  data: ParteTrabajuData;
  imagenes: string[];
}

export default function PDFPreview({ data, imagenes }: PDFPreviewProps) {
  return (
    <Card sx={{ height: "100%", overflow: "auto" }}>
      <CardHeader title="Vista Previa del PDF" />
      <CardContent>
        <Paper
          sx={{
            p: 3,
            backgroundColor: "#f5f5f5",
            borderRadius: 1,
            maxHeight: "80vh",
            overflow: "auto",
          }}
        >
          {/* Encabezado con Logo */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 3,
              pb: 2,
              borderBottom: "2px solid #333",
            }}
          >
            <Logo sx={{ fontSize: 40, mr: 2 }} />
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              PARTE DE TRABAJO
            </Typography>
          </Box>

          {/* Información General */}
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  Fecha:
                </Typography>
                <Typography variant="body2">{data.fecha || "N/A"}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  Nº Documento:
                </Typography>
                <Typography variant="body2">
                  {data.numeroDocumento || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  Documentación Adicional:
                </Typography>
                <Typography variant="body2">
                  {data.tieneDocumentacion ? "Sí" : "No"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  Solicitante:
                </Typography>
                <Typography variant="body2">
                  {data.solicitante || "N/A"}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Servicios */}
          {data.servicios && data.servicios.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                Servicios:
              </Typography>
              {data.servicios.map((servicio, idx) => (
                <Typography key={idx} variant="body2">
                  • {servicio}
                </Typography>
              ))}
            </Box>
          )}

          {/* Dirección */}
          {data.direccion && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                Dirección de Realización:
              </Typography>
              <Typography variant="body2">{data.direccion}</Typography>
            </Box>
          )}

          {/* Descripción */}
          {data.descripcion && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                Descripción del Trabajo:
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
              >
                {data.descripcion}
              </Typography>
            </Box>
          )}

          {/* Imágenes */}
          {imagenes.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                Imágenes del Trabajo:
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: 1,
                }}
              >
                {imagenes.map((img, idx) => (
                  <Box
                    key={idx}
                    component="img"
                    src={img}
                    alt={`trabajo-${idx}`}
                    sx={{
                      width: "100%",
                      height: "150px",
                      borderRadius: 1,
                      border: "1px solid #ccc",
                      objectFit: "cover",
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Observaciones */}
          {data.observaciones && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                Observaciones:
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
              >
                {data.observaciones}
              </Typography>
            </Box>
          )}

          {/* Fecha de Ejecución */}
          {data.fechaEjecucion && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                Fecha de Ejecución:
              </Typography>
              <Typography variant="body2">{data.fechaEjecucion}</Typography>
            </Box>
          )}

          {/* Espacios para Firma y Sello */}
          <Box
            sx={{
              mt: 4,
              pt: 2,
              borderTop: "1px solid #ccc",
            }}
          >
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: "bold", mb: 3 }}>
                  Firma del Trabajador:
                </Typography>
                <Box
                  sx={{
                    borderTop: "1px solid #333",
                    pt: 1,
                    minHeight: "60px",
                  }}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: "bold", mb: 3 }}>
                  Sello de la Empresa:
                </Typography>
                <Box
                  sx={{
                    borderTop: "1px solid #333",
                    pt: 1,
                    minHeight: "60px",
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Paper>
      </CardContent>
    </Card>
  );
}
