"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
} from "@mui/material";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@cuadrantes/shared-dto";
import {
  EmpleadoSimpleDto,
  CuadranteDisponibleDto,
  ConsultaCuadranteResponseDto,
  NOMBRES_MESES,
} from "@cuadrantes/shared-dto";
import api from "@/lib/api";

export default function ConsultaCuadrantesPage() {
  const canRead = usePermissions(PERMISSIONS.CUADRANTES_READ);

  // Estados del formulario
  const [empleados, setEmpleados] = useState<EmpleadoSimpleDto[]>([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<number>(0);
  const [mesInicio, setMesInicio] = useState<number>(1);
  const [anioInicio, setAnioInicio] = useState<number>(
    new Date().getFullYear(),
  );
  const [mesFin, setMesFin] = useState<number>(12);
  const [anioFin, setAnioFin] = useState<number>(new Date().getFullYear());
  const [cuadrantesDisponibles, setCuadrantesDisponibles] = useState<
    CuadranteDisponibleDto[]
  >([]);
  const [cuadranteSeleccionado, setCuadranteSeleccionado] = useState<number>(0);
  const [tipoInicial, setTipoInicial] = useState<boolean>(false);

  // Estados de resultados
  const [resultados, setResultados] =
    useState<ConsultaCuadranteResponseDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingCuadrantes, setLoadingCuadrantes] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const cargarEmpleados = async () => {
    try {
      const { data } = await api.get<EmpleadoSimpleDto[]>(
        "/consulta-cuadrantes/empleados",
      );
      setEmpleados(data);
    } catch (err) {
      setError("Error al cargar la lista de empleados");
      console.error(err);
    }
  };

  const cargarCuadrantesDisponibles = async () => {
    if (empleadoSeleccionado === 0) return;

    setLoadingCuadrantes(true);
    setError("");

    try {
      const { data } = await api.post<CuadranteDisponibleDto[]>(
        "/consulta-cuadrantes/cuadrantes-disponibles",
        {
          empleadoId: empleadoSeleccionado,
          mesInicio,
          anioInicio,
          mesFin,
          anioFin,
        },
      );

      setCuadrantesDisponibles(data);
      if (data.length === 0) {
        setError(
          "No se encontraron cuadrantes disponibles para el empleado en el periodo seleccionado",
        );
      }
    } catch (err) {
      setError("Error al cargar cuadrantes disponibles");
      console.error(err);
    } finally {
      setLoadingCuadrantes(false);
    }
  };

  // Cargar empleados al montar el componente
  useEffect(() => {
    cargarEmpleados();
  }, []);

  // Cargar cuadrantes disponibles cuando cambian empleado o periodo
  useEffect(() => {
    if (empleadoSeleccionado > 0) {
      cargarCuadrantesDisponibles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoSeleccionado, mesInicio, anioInicio, mesFin, anioFin]);

  // Verificar permisos
  if (!canRead) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Alert severity="error">
            No tienes permisos para acceder a esta sección.
          </Alert>
        </Box>
      </Container>
    );
  }

  const handleBuscar = async () => {
    if (empleadoSeleccionado === 0) {
      setError("Debe seleccionar un empleado");
      return;
    }

    if (cuadranteSeleccionado === 0) {
      setError("Debe seleccionar un cuadrante");
      return;
    }

    setLoading(true);
    setError("");
    setResultados(null);

    try {
      const { data } = await api.post<ConsultaCuadranteResponseDto>(
        "/consulta-cuadrantes/consultar",
        {
          empleadoId: empleadoSeleccionado,
          mesInicio,
          anioInicio,
          mesFin,
          anioFin,
          cuadranteId: cuadranteSeleccionado,
          tipoInicial,
        },
      );
      setResultados(data);
    } catch (err) {
      setError("Error al realizar la consulta");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarPDF = async () => {
    if (!resultados) return;

    try {
      const response = await api.post(
        "/consulta-cuadrantes/generar-pdf",
        {
          empleadoId: empleadoSeleccionado,
          mesInicio,
          anioInicio,
          mesFin,
          anioFin,
          cuadranteId: cuadranteSeleccionado,
          tipoInicial,
        },
        {
          responseType: "blob",
        },
      );

      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cuadrante-${resultados.empleado.nombre}-${resultados.cuadrante.nombre}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError("Error al generar el PDF");
      console.error(err);
    }
  };

  const handleEnviarEmail = async () => {
    if (!resultados) return;

    try {
      const { data: result } = await api.post<{
        success: boolean;
        message: string;
      }>("/consulta-cuadrantes/enviar-pdf-email", {
        empleadoId: empleadoSeleccionado,
        mesInicio,
        anioInicio,
        mesFin,
        anioFin,
        cuadranteId: cuadranteSeleccionado,
        tipoInicial,
      });

      if (result.success) {
        alert("Email enviado correctamente");
      } else {
        alert(result.message);
      }
    } catch (err) {
      setError("Error al enviar el email");
      console.error(err);
    }
  };

  // Función auxiliar para convertir color numérico a hex
  const colorToHex = (colorNum: number | undefined): string => {
    if (!colorNum && colorNum !== 0) return "#FFFFFF";
    const hex = colorNum.toString(16).padStart(6, "0");
    return `#${hex}`;
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Consulta de Cuadrantes
        </Typography>

        {/* Formulario de búsqueda */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            {/* Empleado */}
            <Grid size={{ xs: 12, md: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Empleado</InputLabel>
                <Select
                  data-testid="empleado-select"
                  value={empleadoSeleccionado}
                  onChange={(e) =>
                    setEmpleadoSeleccionado(Number(e.target.value))
                  }
                  label="Empleado"
                >
                  <MenuItem value={0}>Seleccione un empleado</MenuItem>
                  {empleados.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Periodo inicio */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" gutterBottom>
                Periodo Inicio
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Mes</InputLabel>
                    <Select
                      data-testid="mes-inicio-select"
                      value={mesInicio}
                      onChange={(e) => setMesInicio(Number(e.target.value))}
                      label="Mes"
                    >
                      {NOMBRES_MESES.map((mes, idx) => (
                        <MenuItem key={idx + 1} value={idx + 1}>
                          {mes}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    data-testid="anio-inicio-select"
                    fullWidth
                    type="number"
                    label="Año"
                    value={anioInicio}
                    onChange={(e) => setAnioInicio(Number(e.target.value))}
                    inputProps={{ min: 2000, max: 2100 }}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Periodo fin */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" gutterBottom>
                Periodo Fin
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Mes</InputLabel>
                    <Select
                      value={mesFin}
                      onChange={(e) => setMesFin(Number(e.target.value))}
                      label="Mes"
                    >
                      {NOMBRES_MESES.map((mes, idx) => (
                        <MenuItem key={idx + 1} value={idx + 1}>
                          {mes}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Año"
                    value={anioFin}
                    onChange={(e) => setAnioFin(Number(e.target.value))}
                    inputProps={{ min: 2000, max: 2100 }}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Cuadrante */}
            <Grid size={{ xs: 12 }}>
              <FormControl
                fullWidth
                disabled={loadingCuadrantes || empleadoSeleccionado === 0}
              >
                <InputLabel>Cuadrante</InputLabel>
                <Select
                  data-testid="cuadrante-select"
                  value={cuadranteSeleccionado}
                  onChange={(e) =>
                    setCuadranteSeleccionado(Number(e.target.value))
                  }
                  label="Cuadrante"
                >
                  <MenuItem value={0}>Seleccione un cuadrante</MenuItem>
                  {cuadrantesDisponibles.map((cuad) => (
                    <MenuItem key={cuad.id} value={cuad.id}>
                      {cuad.nombre} - {cuad.departamentoNombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {loadingCuadrantes && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
            </Grid>

            {/* Tipo de cuadrante */}
            <Grid size={{ xs: 12 }}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Tipo de Cuadrante</FormLabel>
                <RadioGroup
                  row
                  value={tipoInicial ? "inicial" : "modificado"}
                  onChange={(e) => setTipoInicial(e.target.value === "inicial")}
                >
                  <FormControlLabel
                    value="inicial"
                    control={<Radio />}
                    label="Inicial"
                  />
                  <FormControlLabel
                    value="modificado"
                    control={<Radio />}
                    label="Modificado"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {/* Botón Buscar */}
            <Grid size={{ xs: 12 }}>
              <Button
                data-testid="buscar-button"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                onClick={handleBuscar}
                disabled={
                  loading ||
                  empleadoSeleccionado === 0 ||
                  cuadranteSeleccionado === 0
                }
              >
                {loading ? <CircularProgress size={24} /> : "Buscar"}
              </Button>
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Paper>

        {/* Resultados */}
        {resultados && (
          <>
            {/* Información del empleado y cuadrante */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {resultados.empleado.nombre}
              </Typography>
              <Typography variant="body2">
                Cuadrante: {resultados.cuadrante.nombre} -{" "}
                {resultados.cuadrante.departamentoNombre}
              </Typography>
              <Typography variant="body2">
                Tipo: {tipoInicial ? "Inicial" : "Modificado"}
              </Typography>
            </Paper>

            {/* Tabla de asignaciones */}
            <Paper sx={{ mb: 3, overflowX: "auto" }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Mes</TableCell>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(
                        (dia) => (
                          <TableCell
                            key={dia}
                            align="center"
                            sx={{ minWidth: 40 }}
                          >
                            {dia}
                          </TableCell>
                        ),
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultados.meses.map((mes) => (
                      <TableRow key={`${mes.anio}-${mes.mes}`}>
                        <TableCell>
                          {mes.mesNombre} {mes.anio}
                        </TableCell>
                        {mes.asignaciones.map((asig, idx) => (
                          <TableCell
                            key={idx}
                            align="center"
                            sx={{
                              backgroundColor: asig
                                ? colorToHex(asig.colorfondo)
                                : "transparent",
                              color: asig
                                ? colorToHex(asig.colortexto)
                                : "inherit",
                              fontWeight: asig ? "bold" : "normal",
                              fontSize: "0.75rem",
                              padding: "4px",
                            }}
                          >
                            {asig?.abreviatura || ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Leyenda */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Leyenda de Estados
              </Typography>
              <Grid container spacing={2}>
                {resultados.estadosUsados.map((estado) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={estado.id}>
                    <Card
                      sx={{
                        backgroundColor: colorToHex(estado.colorfondo),
                        color: colorToHex(estado.colortexto),
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" component="div">
                          {estado.abreviatura}
                        </Typography>
                        <Typography variant="body2">
                          {estado.descrip}
                        </Typography>
                        <Typography variant="body2">
                          {estado.horainicio && estado.horafin
                            ? `${estado.horainicio} - ${estado.horafin}`
                            : "Sin horario"}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            {/* Botones de acción */}
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button
                data-testid="descargar-pdf-button"
                variant="contained"
                color="primary"
                onClick={handleGenerarPDF}
              >
                Descargar PDF
              </Button>
              <Button
                data-testid="enviar-email-button"
                variant="contained"
                color="secondary"
                onClick={handleEnviarEmail}
                disabled={!resultados.empleado.email}
              >
                {resultados.empleado.email
                  ? "Enviar por Email"
                  : "Sin Email Configurado"}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
}
