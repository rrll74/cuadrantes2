"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Card,
  CardContent,
  CardHeader,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useForm, Controller } from "react-hook-form";
import { generatePDFFromData } from "@/lib/pdf-generator";
import axios from "axios";
import PDFPreview from "./PDFPreview";

interface Departamento {
  id: number;
  nombre: string;
}

interface FormData {
  fecha: string;
  numeroDocumento: string;
  tieneDocumentacion: boolean;
  solicitante: string;
  servicios: string[];
  direccion: string;
  descripcion: string;
  imagenes: File[];
  observaciones: string;
  fechaEjecucion: string;
}

export default function ParteTrabajoForm() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { control, handleSubmit, watch, formState, reset } = useForm({
    defaultValues: {
      fecha: new Date().toISOString().split("T")[0],
      numeroDocumento: "",
      tieneDocumentacion: false,
      solicitante: "",
      servicios: [],
      direccion: "",
      descripcion: "",
      imagenes: [],
      observaciones: "",
      fechaEjecucion: "",
    },
  });

  const formValues = watch();

  // Cargar departamentos desde la API
  useEffect(() => {
    const fetchDepartamentos = async () => {
      setLoadingDepts(true);
      try {
        // Intentamos obtener los departamentos de la API del sistema
        const response = await axios.get("/api/departamentos");
        setDepartamentos(response.data);
      } catch (error) {
        console.error("Error al cargar departamentos:", error);
        // Datos de ejemplo si la API no está disponible
        setDepartamentos([
          { id: 1, nombre: "Almacén" },
          { id: 2, nombre: "Brigada Operativa" },
          { id: 3, nombre: "Limpieza" },
          { id: 4, nombre: "Pintura y rotulación" },
          { id: 5, nombre: "Parque Móvil" },
          { id: 6, nombre: "Servicio eléctrico" },
        ]);
      } finally {
        setLoadingDepts(false);
      }
    };

    fetchDepartamentos();
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages: string[] = [];
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newImages.push(e.target.result as string);
            if (newImages.length === files.length) {
              setImagenes([...imagenes, ...newImages]);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImagenes(imagenes.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    reset();
    setImagenes([]);
    setShowPreview(false);
  };

  const onSubmit = async (data: FormData) => {
    try {
      setGeneratingPDF(true);

      const parteData = {
        fecha: data.fecha,
        numeroDocumento: data.numeroDocumento,
        tieneDocumentacion: data.tieneDocumentacion,
        solicitante: data.solicitante,
        servicios: data.servicios,
        direccion: data.direccion,
        descripcion: data.descripcion,
        imagenes: imagenes,
        observaciones: data.observaciones,
        fechaEjecucion: data.fechaEjecucion,
      };

      await generatePDFFromData(parteData);

      const numPDFs = data.servicios.length || 1;
      alert(
        numPDFs > 1
          ? `Se han generado ${numPDFs} PDFs correctamente (uno por cada servicio seleccionado)`
          : "PDF generado correctamente",
      );
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Error al generar el PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", py: 4 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
        }}
      >
        {/* Formulario */}
        <Box>
          <Card>
            <CardHeader title="Formulario de Orden de Trabajo" />
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {/* Fecha */}
                  <Controller
                    name="fecha"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Fecha"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        slotProps={{
                          htmlInput: { min: "2020-01-01" },
                        }}
                      />
                    )}
                  />

                  {/* Número de Documento */}
                  <Controller
                    name="numeroDocumento"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Número de Documento"
                        placeholder="Máximo 15 caracteres"
                        fullWidth
                        error={!!formState.errors.numeroDocumento}
                        helperText={formState.errors.numeroDocumento?.message}
                      />
                    )}
                  />

                  {/* Documentación Adicional */}
                  <Controller
                    name="tieneDocumentacion"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Checkbox {...field} checked={field.value} />}
                        label="Tiene documentación adicional"
                      />
                    )}
                  />

                  {/* Solicitante */}
                  <Controller
                    name="solicitante"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Solicitante"
                        placeholder="Máximo 50 caracteres"
                        fullWidth
                        error={!!formState.errors.solicitante}
                        helperText={formState.errors.solicitante?.message}
                      />
                    )}
                  />

                  {/* Servicios */}
                  <Controller
                    name="servicios"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Servicios</InputLabel>
                        <Select
                          {...field}
                          label="Servicios"
                          multiple
                          disabled={loadingDepts}
                          error={!!formState.errors.servicios}
                        >
                          {departamentos.map((dept) => (
                            <MenuItem key={dept.id} value={dept.nombre}>
                              {dept.nombre}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />

                  {/* Mensaje informativo sobre múltiples servicios */}
                  {formValues.servicios && formValues.servicios.length > 1 && (
                    <Box
                      sx={{
                        p: 1.5,
                        bgcolor: "info.light",
                        borderRadius: 1,
                        color: "info.contrastText",
                      }}
                    >
                      <Typography variant="body2">
                        ℹ️ Se generarán {formValues.servicios.length} PDFs (uno
                        por cada servicio seleccionado). El número de documento
                        incluirá un sufijo secuencial (-1, -2, etc.)
                      </Typography>
                    </Box>
                  )}

                  {/* Dirección */}
                  <Controller
                    name="direccion"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Dirección de Realización"
                        placeholder="Máximo 200 caracteres"
                        fullWidth
                        multiline
                        rows={2}
                        error={!!formState.errors.direccion}
                        helperText={formState.errors.direccion?.message}
                      />
                    )}
                  />

                  {/* Descripción */}
                  <Controller
                    name="descripcion"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Descripción del Trabajo"
                        fullWidth
                        multiline
                        rows={4}
                        error={!!formState.errors.descripcion}
                        helperText={formState.errors.descripcion?.message}
                      />
                    )}
                  />

                  {/* Observaciones */}
                  <Controller
                    name="observaciones"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Observaciones"
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Opcional"
                      />
                    )}
                  />

                  {/* Fecha de Ejecución */}
                  <Controller
                    name="fechaEjecucion"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Fecha de Ejecución"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />
                    )}
                  />

                  {/* Carga de Imágenes */}
                  <Box sx={{ mt: 2 }}>
                    <input
                      multiple
                      accept="image/*"
                      style={{ display: "none" }}
                      id="image-upload"
                      type="file"
                      onChange={handleImageUpload}
                    />
                    <label htmlFor="image-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<CloudUploadIcon />}
                        fullWidth
                      >
                        Agregar Imágenes
                      </Button>
                    </label>
                  </Box>

                  {/* Galería de Imágenes */}
                  {imagenes.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Imágenes cargadas ({imagenes.length})
                      </Typography>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(100px, 1fr))",
                          gap: 1,
                        }}
                      >
                        {imagenes.map((img, idx) => (
                          <Box key={idx}>
                            <Box
                              sx={{
                                position: "relative",
                                paddingBottom: "100%",
                                overflow: "hidden",
                                borderRadius: 1,
                                border: "1px solid #ccc",
                              }}
                            >
                              <Box
                                component="img"
                                src={img}
                                alt={`preview-${idx}`}
                                sx={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  cursor: "pointer",
                                }}
                                onClick={() => removeImage(idx)}
                                title="Click para eliminar"
                              />
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Botones de Acción */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      mt: 3,
                      flexDirection: "column",
                    }}
                  >
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        startIcon={<FileDownloadIcon />}
                        disabled={generatingPDF}
                      >
                        {generatingPDF ? "Generando PDF..." : "Generar PDF"}
                      </Button>
                      <Button
                        type="button"
                        variant="outlined"
                        fullWidth
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        {showPreview ? "Cerrar Vista Previa" : "Vista Previa"}
                      </Button>
                    </Box>
                    <Button
                      type="button"
                      variant="outlined"
                      color="error"
                      fullWidth
                      startIcon={<DeleteOutlineIcon />}
                      onClick={handleReset}
                    >
                      Limpiar Formulario
                    </Button>
                  </Box>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Box>

        {/* Vista Previa del PDF */}
        {showPreview && (
          <Box>
            <PDFPreview data={formValues} imagenes={imagenes} />
          </Box>
        )}
      </Box>

      {generatingPDF && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.3)",
            zIndex: 1000,
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}
