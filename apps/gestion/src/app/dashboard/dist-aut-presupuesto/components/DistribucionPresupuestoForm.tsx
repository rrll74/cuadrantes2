"use client";

import { useRef } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useDistribucionPresupuesto } from "../hooks/useDistribucionPresupuesto";
import { DistribucionResultadosTable } from "./DistribucionResultadosTable";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);

export const DistribucionPresupuestoForm = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const {
    file,
    budgetTotal,
    materials,
    errors,
    resultInfo,
    distributionResult,
    isParsing,
    isExporting,
    parsedBudget,
    handleFileChange,
    handleBudgetChange,
    calculateDistribution,
    handleExportExcel,
    handleExportPdf,
    reset,
  } = useDistribucionPresupuesto();

  const hasBudgetError =
    Boolean(budgetTotal) &&
    (!Number.isFinite(parsedBudget) || parsedBudget <= 0);

  const handleSelectFile = () => {
    inputRef.current?.click();
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0] ?? null;
    handleFileChange(selectedFile);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await calculateDistribution();
  };

  const hasValidationErrors = errors.length > 0;

  return (
    <Paper sx={{ p: 4, borderRadius: 3 }} elevation={1}>
      <Stack spacing={3} component="form" onSubmit={handleSubmit}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
            Carga de Excel y validación
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
            El presupuesto objetivo es obligatorio. La clave de cada material se
            toma de la descripcion del Excel.
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Presupuesto objetivo"
            value={budgetTotal}
            onChange={(event) => handleBudgetChange(event.target.value)}
            fullWidth
            required
            inputMode="decimal"
            error={hasBudgetError}
            helperText={
              hasBudgetError
                ? "Introduce un número mayor que 0."
                : "Importe final al que debe ajustarse el reparto."
            }
          />

          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={handleFileInputChange}
            />
            <Button
              variant="outlined"
              onClick={handleSelectFile}
              sx={{ minWidth: 220 }}
            >
              {file ? "Cambiar Excel" : "Seleccionar Excel"}
            </Button>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button
            type="submit"
            variant="contained"
            disabled={
              isParsing || !file || !budgetTotal.trim() || hasBudgetError
            }
          >
            {isParsing ? "Validando..." : "Validar fichero"}
          </Button>
          <Button
            type="button"
            variant="text"
            onClick={reset}
            disabled={isParsing}
          >
            Limpiar
          </Button>
        </Stack>

        {file && (
          <Alert severity="info">Fichero seleccionado: {file.name}</Alert>
        )}

        {resultInfo && <Alert severity="success">{resultInfo}</Alert>}

        {hasValidationErrors && (
          <Alert severity="error">
            <Stack spacing={1}>
              {errors.map((error, index) => (
                <Box
                  key={`${error.field}-${error.rowNumber ?? "global"}-${index}`}
                >
                  {error.rowNumber ? `Fila ${error.rowNumber}: ` : ""}
                  {error.message}
                </Box>
              ))}
            </Stack>
          </Alert>
        )}

        {materials.length > 0 && distributionResult === null && (
          <Box>
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
              Materiales validados
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell align="right">Precio unitario</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {materials.map((material) => (
                  <TableRow
                    key={`${material.rowNumber}-${material.descripcion}`}
                  >
                    <TableCell>{material.codigo || "-"}</TableCell>
                    <TableCell>{material.descripcion}</TableCell>
                    <TableCell align="right">
                      {formatMoney(material.precioUnitario)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        <DistribucionResultadosTable
          result={distributionResult}
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
          isExporting={isExporting}
        />

        {budgetTotal && !hasBudgetError && (
          <Alert severity="info">
            Presupuesto objetivo introducido: {formatMoney(parsedBudget)}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
};
