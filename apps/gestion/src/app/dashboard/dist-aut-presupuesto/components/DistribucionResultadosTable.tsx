"use client";

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
  Typography,
} from "@mui/material";
import type { DistributionResult } from "../lib/types";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);

interface DistribucionResultadosTableProps {
  result: DistributionResult | null;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
}

export const DistribucionResultadosTable = ({
  result,
  onExportExcel,
  onExportPdf,
  isExporting,
}: DistribucionResultadosTableProps) => {
  if (!result) {
    return null;
  }

  const { rows, summary } = result;

  return (
    <Paper sx={{ p: 4, borderRadius: 3 }} elevation={1}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
            Resultado de la distribución
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
            El reparto se ha calculado con ponderación inversa al precio
            unitario y un factor aleatorio controlado.
          </Typography>
        </Box>

        <Alert severity={summary.diferencia === 0 ? "success" : "warning"}>
          Objetivo: {formatMoney(summary.presupuestoObjetivo)} | Calculado:{" "}
          {formatMoney(summary.subtotalCalculado)} | Diferencia:{" "}
          {formatMoney(summary.diferencia)}
        </Alert>

        {summary.ajusteFinalAplicado && summary.diferencia !== 0 && (
          <Alert severity="info">
            Se aplicó un ajuste final de cierre para aproximar el total al
            presupuesto objetivo.
          </Alert>
        )}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="right">Precio unitario</TableCell>
              <TableCell align="right">Unidades</TableCell>
              <TableCell align="right">Subtotal</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.rowNumber}-${row.descripcion}`}>
                <TableCell>{row.codigo || "-"}</TableCell>
                <TableCell>{row.descripcion}</TableCell>
                <TableCell align="right">
                  {formatMoney(row.precioUnitario)}
                </TableCell>
                <TableCell align="right">{row.unidades.toFixed(1)}</TableCell>
                <TableCell align="right">{formatMoney(row.subtotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Total de materiales: {rows.length}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={onExportExcel}
              disabled={isExporting}
            >
              Exportar Excel
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={onExportPdf}
              disabled={isExporting}
            >
              Exportar PDF
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};
