import type {
  DistributionResult,
  MaterialDistributionRow,
  MaterialInputRow,
} from "./types";

const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100;
const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;
const EPSILON = 0.001;

const randomWeightFactor = () => 0.8 + Math.random() * 0.4;

const roundByPreference = (value: number) => {
  const rounded = roundToOneDecimal(value);
  const integerCandidate = Math.round(rounded);

  if (Math.abs(rounded - integerCandidate) <= 0.1 + EPSILON) {
    return integerCandidate;
  }

  return rounded;
};

const aplicarAjusteFinalExacto = (
  rows: MaterialDistributionRow[],
  presupuestoObjetivo: number,
) => {
  let ajusteFinalAplicado = false;
  const maxIteraciones = 1000;

  const rowsByPrecioAsc = [...rows].sort(
    (a, b) => a.precioUnitario - b.precioUnitario,
  );

  const aplicarDeltaConPaso = (deltaUnidades: number, diferencia: number) => {
    for (const row of rowsByPrecioAsc) {
      const candidatoUnidades = roundToOneDecimal(row.unidades + deltaUnidades);
      if (candidatoUnidades < 0.1 - EPSILON) {
        continue;
      }

      const subtotalCandidato = roundToTwoDecimals(
        candidatoUnidades * row.precioUnitario,
      );
      const impacto = roundToTwoDecimals(subtotalCandidato - row.subtotal);

      if (deltaUnidades > 0 && impacto <= diferencia + EPSILON) {
        row.unidades = candidatoUnidades;
        row.subtotal = subtotalCandidato;
        return true;
      }

      if (deltaUnidades < 0 && -impacto <= Math.abs(diferencia) + EPSILON) {
        row.unidades = candidatoUnidades;
        row.subtotal = subtotalCandidato;
        return true;
      }
    }

    return false;
  };

  const aplicarAjusteFino = (diferencia: number) => {
    for (const row of rowsByPrecioAsc) {
      if (diferencia > 0) {
        const delta = roundByPreference(diferencia / row.precioUnitario);
        if (delta <= 0) {
          continue;
        }

        const candidatoUnidades = roundToOneDecimal(row.unidades + delta);
        const subtotalCandidato = roundToTwoDecimals(
          candidatoUnidades * row.precioUnitario,
        );
        const impacto = roundToTwoDecimals(subtotalCandidato - row.subtotal);

        if (impacto <= diferencia + EPSILON) {
          row.unidades = candidatoUnidades;
          row.subtotal = subtotalCandidato;
          return true;
        }

        continue;
      }

      const delta = roundByPreference(
        Math.abs(diferencia) / row.precioUnitario,
      );
      if (delta <= 0) {
        continue;
      }

      const candidatoUnidades = roundToOneDecimal(row.unidades - delta);
      if (candidatoUnidades < 0.1 - EPSILON) {
        continue;
      }

      const subtotalCandidato = roundToTwoDecimals(
        candidatoUnidades * row.precioUnitario,
      );
      const impacto = roundToTwoDecimals(row.subtotal - subtotalCandidato);

      if (impacto <= Math.abs(diferencia) + EPSILON) {
        row.unidades = candidatoUnidades;
        row.subtotal = subtotalCandidato;
        return true;
      }
    }

    return false;
  };

  const aplicarMejorMovimiento = (diferencia: number) => {
    let mejor:
      | {
          row: MaterialDistributionRow;
          unidades: number;
          subtotal: number;
          nuevaDiferencia: number;
        }
      | undefined;

    for (const row of rowsByPrecioAsc) {
      for (const delta of [0.1, -0.1]) {
        const candidatoUnidades = roundToOneDecimal(row.unidades + delta);
        if (candidatoUnidades < 0.1 - EPSILON) {
          continue;
        }

        const subtotalCandidato = roundToTwoDecimals(
          candidatoUnidades * row.precioUnitario,
        );
        const impacto = roundToTwoDecimals(subtotalCandidato - row.subtotal);
        const nuevaDiferencia = roundToTwoDecimals(diferencia - impacto);

        if (
          !mejor ||
          Math.abs(nuevaDiferencia) < Math.abs(mejor.nuevaDiferencia)
        ) {
          mejor = {
            row,
            unidades: candidatoUnidades,
            subtotal: subtotalCandidato,
            nuevaDiferencia,
          };
        }
      }
    }

    if (!mejor || Math.abs(mejor.nuevaDiferencia) >= Math.abs(diferencia)) {
      return false;
    }

    mejor.row.unidades = mejor.unidades;
    mejor.row.subtotal = mejor.subtotal;
    return true;
  };

  for (let iteracion = 0; iteracion < maxIteraciones; iteracion += 1) {
    const subtotalCalculado = roundToTwoDecimals(
      rows.reduce((acumulado, row) => acumulado + row.subtotal, 0),
    );
    const diferencia = roundToTwoDecimals(
      presupuestoObjetivo - subtotalCalculado,
    );

    if (Math.abs(diferencia) < EPSILON) {
      return { ajusteFinalAplicado, subtotalCalculado, diferencia: 0 };
    }

    const ajustadoPorPaso =
      diferencia > 0
        ? aplicarDeltaConPaso(0.1, diferencia)
        : aplicarDeltaConPaso(-0.1, diferencia);

    const ajustado =
      ajustadoPorPaso ||
      aplicarAjusteFino(diferencia) ||
      aplicarMejorMovimiento(diferencia);

    if (!ajustado) {
      break;
    }

    ajusteFinalAplicado = true;
  }

  const materialMasBarato = rowsByPrecioAsc[0];
  const subtotalPreResidual = roundToTwoDecimals(
    rows.reduce((acumulado, row) => acumulado + row.subtotal, 0),
  );
  const residualFinal = roundToTwoDecimals(
    presupuestoObjetivo - subtotalPreResidual,
  );

  if (
    Math.abs(residualFinal) >= EPSILON &&
    (residualFinal > 0 || materialMasBarato.unidades > 0.1)
  ) {
    materialMasBarato.subtotal = roundToTwoDecimals(
      materialMasBarato.subtotal + residualFinal,
    );
    ajusteFinalAplicado = true;
  }

  const subtotalCalculado = roundToTwoDecimals(
    rows.reduce((acumulado, row) => acumulado + row.subtotal, 0),
  );
  const diferencia = roundToTwoDecimals(
    presupuestoObjetivo - subtotalCalculado,
  );

  return { ajusteFinalAplicado, subtotalCalculado, diferencia };
};

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

  const { ajusteFinalAplicado, subtotalCalculado, diferencia } =
    aplicarAjusteFinalExacto(distributedRows, presupuestoObjetivo);

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
