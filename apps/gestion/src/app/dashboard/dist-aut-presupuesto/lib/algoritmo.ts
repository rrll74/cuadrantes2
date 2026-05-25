import type {
  DistributionResult,
  MaterialDistributionRow,
  MaterialInputRow,
} from "./types";

const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100;
const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;

const randomWeightFactor = () => 0.8 + Math.random() * 0.4;

export const distribuirPresupuesto = (
  materials: MaterialInputRow[],
  presupuestoObjetivo: number,
): DistributionResult => {
  if (materials.length === 0) {
    throw new Error("La lista de materiales no puede estar vacía.");
  }

  const baseRows: MaterialDistributionRow[] = materials.map((material) => {
    const unidadesIniciales = 0.1;
    const subtotalInicial = roundToTwoDecimals(
      material.precioUnitario * unidadesIniciales,
    );

    return {
      ...material,
      unidades: unidadesIniciales,
      subtotal: subtotalInicial,
      peso: 0,
    };
  });

  const subtotalInicialTotal = baseRows.reduce(
    (acumulado, row) => acumulado + row.subtotal,
    0,
  );
  const presupuestoRestante = roundToTwoDecimals(
    presupuestoObjetivo - subtotalInicialTotal,
  );

  if (presupuestoRestante < 0) {
    throw new Error(
      "El presupuesto es insuficiente para cubrir el mínimo de 0.1 unidades por material.",
    );
  }

  const weights = materials.map((material) => {
    const factor = randomWeightFactor();
    return (1 / material.precioUnitario) * factor;
  });

  const totalWeight = weights.reduce(
    (acumulado, weight) => acumulado + weight,
    0,
  );

  const distributedRows = baseRows.map((row, index) => {
    const proportion = totalWeight > 0 ? weights[index] / totalWeight : 0;
    const moneyShare = presupuestoRestante * proportion;
    const extraUnits = Math.floor((moneyShare / row.precioUnitario) * 10) / 10;
    const unidades = roundToOneDecimal(row.unidades + extraUnits);
    const subtotal = roundToTwoDecimals(unidades * row.precioUnitario);

    return {
      ...row,
      unidades,
      subtotal,
      peso: weights[index],
    };
  });

  let subtotalCalculado = roundToTwoDecimals(
    distributedRows.reduce((acumulado, row) => acumulado + row.subtotal, 0),
  );
  let diferencia = roundToTwoDecimals(presupuestoObjetivo - subtotalCalculado);
  let ajusteFinalAplicado = false;

  if (Math.abs(diferencia) >= 0.01) {
    const lastIndex = distributedRows.length - 1;
    const lastRow = distributedRows[lastIndex];
    const unidadesAjustadas = roundToOneDecimal(
      lastRow.unidades + diferencia / lastRow.precioUnitario,
    );

    distributedRows[lastIndex] = {
      ...lastRow,
      unidades: unidadesAjustadas,
      subtotal: roundToTwoDecimals(unidadesAjustadas * lastRow.precioUnitario),
    };
    ajusteFinalAplicado = true;

    subtotalCalculado = roundToTwoDecimals(
      distributedRows.reduce((acumulado, row) => acumulado + row.subtotal, 0),
    );
    diferencia = roundToTwoDecimals(presupuestoObjetivo - subtotalCalculado);
  }

  return {
    rows: distributedRows,
    summary: {
      presupuestoObjetivo: roundToTwoDecimals(presupuestoObjetivo),
      subtotalCalculado,
      diferencia,
      ajusteFinalAplicado,
    },
  };
};
