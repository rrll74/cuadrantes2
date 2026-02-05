"use client";

import {
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  Paper,
  Grid,
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

// Función para formatear fecha de YYYY-MM-DD a DD/MM/AAAA
const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
};

// Componente para campo con borde
const FieldBox = ({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) => (
  <Box
    sx={{
      p: 1.5,
      border: "1px solid #666",
      borderRadius: 0,
      backgroundColor: "#fff",
    }}
  >
    <Typography
      variant="caption"
      sx={{
        fontWeight: "bold",
        display: "block",
        color: "#333",
        mb: 0.5,
      }}
    >
      {label}
    </Typography>
    {children ? (
      children
    ) : (
      <Typography variant="body2" sx={{ color: "#333" }}>
        {value || ""}
      </Typography>
    )}
  </Box>
);

export default function PDFPreview({ data, imagenes }: PDFPreviewProps) {
  const fechaFormato = formatDate(data.fecha || "");
  const fechaEjecFormato = formatDate(data.fechaEjecucion || "");

  // Calcular altura dinámica para "Trabajo a realizar"
  const descriptionLines = Math.max(
    3,
    Math.ceil((data.descripcion || "").length / 80),
  );
  const descriptionHeight = Math.max(120, descriptionLines * 20 + 20);

  return (
    <Card sx={{ height: "100%", overflow: "auto" }}>
      <CardHeader title="Vista Previa del PDF" />
      <CardContent>
        <Paper
          sx={{
            p: 3,
            backgroundColor: "#f5f5f5",
            borderRadius: 0,
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
              ORDEN DE TRABAJO
            </Typography>
          </Box>

          {/* 1-3. TAO, Doc. Adjunta y Fecha - 3 columnas */}
          <Grid container spacing={1} sx={{ mb: 1 }}>
            <Grid size={{ xs: 6, md: 4 }}>
              <FieldBox label="TAO" value={data.numeroDocumento || ""} />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <FieldBox
                label="Doc. Adjunta"
                value={data.tieneDocumentacion ? "Sí" : "No"}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <FieldBox label="Fecha" value={fechaFormato} />
            </Grid>
          </Grid>

          {/* 4. Solicitante */}
          <Box sx={{ mb: 1 }}>
            <FieldBox label="Solicitante" value={data.solicitante || ""} />
          </Box>

          {/* 5. Servicio de destino */}
          <Box sx={{ mb: 1 }}>
            <Box
              sx={{
                p: 1.5,
                border: "1px solid #666",
                borderRadius: 0,
                backgroundColor: "#fff",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: "bold",
                  display: "block",
                  color: "#333",
                  mb: 0.5,
                }}
              >
                Servicio de destino
              </Typography>
              {data.servicios && data.servicios.length > 0 ? (
                <Typography variant="body2" sx={{ color: "#333" }}>
                  {data.servicios[0]}
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ color: "#999" }}>
                  No seleccionado
                </Typography>
              )}
            </Box>
          </Box>

          {/* 6. Lugar de realización */}
          <Box sx={{ mb: 1 }}>
            <Box
              sx={{
                p: 1.5,
                border: "1px solid #666",
                borderRadius: 0,
                backgroundColor: "#fff",
                minHeight: "80px",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: "bold",
                  display: "block",
                  color: "#333",
                  mb: 0.5,
                }}
              >
                Lugar de realización
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#333",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {data.direccion || ""}
              </Typography>
            </Box>
          </Box>

          {/* 7. Trabajo a realizar - altura dinámica */}
          <Box sx={{ mb: 1 }}>
            <Box
              sx={{
                p: 1.5,
                border: "1px solid #666",
                borderRadius: 0,
                backgroundColor: "#fff",
                minHeight: `${descriptionHeight}px`,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: "bold",
                  display: "block",
                  color: "#333",
                  mb: 0.5,
                }}
              >
                Trabajo a realizar
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#333",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {data.descripcion || ""}
              </Typography>
            </Box>
          </Box>

          {/* 8-9. Observaciones (80%) y Fecha de terminación (20%) - misma línea */}
          <Grid container spacing={1} sx={{ mb: 1 }}>
            <Grid size={{ xs: 6, md: 8 }}>
              <Box
                sx={{
                  p: 1.5,
                  border: "1px solid #666",
                  borderRadius: 0,
                  backgroundColor: "#fff",
                  minHeight: "120px",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: "bold",
                    display: "block",
                    color: "#333",
                    mb: 0.5,
                  }}
                >
                  Observaciones
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#333",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: "0.875rem",
                  }}
                >
                  {data.observaciones || ""}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <Box
                sx={{
                  p: 1.5,
                  border: "1px solid #666",
                  borderRadius: 0,
                  backgroundColor: "#fff",
                  minHeight: "120px",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: "bold",
                    display: "block",
                    color: "#333",
                    mb: 0.5,
                    fontSize: "0.7rem",
                  }}
                >
                  Fecha de terminación
                </Typography>
                <Typography variant="body2" sx={{ color: "#333" }}>
                  {fechaEjecFormato}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* 10. Realizado por (Firma y Sello) - ANTES de fotos */}
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: "bold",
                color: "#333",
                mb: 1,
              }}
            >
              Realizado por (Firma y Sello):
            </Typography>
            <Box
              sx={{
                border: "1px solid #666",
                borderRadius: 0,
                minHeight: "120px",
                backgroundColor: "#fff",
              }}
            />
          </Box>

          {/* 11. Fotos - AL FINAL */}
          {imagenes.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: "bold",
                  color: "#333",
                  mb: 1,
                }}
              >
                Fotos:
              </Typography>
              <Grid container spacing={2}>
                {imagenes.map((img, idx) => (
                  <Grid size={{ xs: 6, md: 12 }} key={idx}>
                    <Box
                      component="img"
                      src={img}
                      alt={`foto-${idx}`}
                      sx={{
                        width: "100%",
                        height: "200px",
                        border: "1px solid #666",
                        borderRadius: 0,
                        objectFit: "contain",
                        backgroundColor: "#f0f0f0",
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Paper>
      </CardContent>
    </Card>
  );
}
