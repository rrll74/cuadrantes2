/**
 * Interfaz para los materiales de entrada
 */
export interface Material {
  codigo: string;
  descripcion: string;
  precio: number; // Precio en euros con hasta dos decimales
}

/**
 * Interfaz para el resultado de la distribución
 */
export interface ResultadoDistribucion extends Material {
  cantidad: number;
  subtotal: number;
}

/**
 * Módulo de distribución de presupuesto
 */
export class DistribuidorPresupuesto {
  /**
   * Ejecuta el algoritmo de reparto proporcional inverso
   * @param presupuestoTotal Presupuesto total a repartir
   * @param materiales Lista de materiales disponibles
   */
  public distribuir(
    presupuestoTotal: number,
    materiales: Material[],
  ): ResultadoDistribucion[] {
    if (materiales.length === 0)
      throw new Error("La lista de materiales no puede estar vacía.");

    const n = materiales.length;
    let presupuestoRestante = presupuestoTotal;

    // 1. ASIGNACIÓN MÍNIMA OBLIGATORIA (0.1 unidades por material)
    const resultados: ResultadoDistribucion[] = materiales.map((m) => {
      const cantidadMinima = 0.1;
      const subtotalMinimo = this.redondearCentimos(m.precio * cantidadMinima);
      presupuestoRestante -= subtotalMinimo;

      return {
        ...m,
        cantidad: cantidadMinima,
        subtotal: subtotalMinimo,
      };
    });

    if (presupuestoRestante < 0) {
      throw new Error(
        "El presupuesto es insuficiente para cubrir el mínimo de 0.1 unidades por material.",
      );
    }

    // 2. CÁLCULO DE PESOS INVERSOS CON ALEATORIEDAD
    // Cuanto más barato, más peso (1/precio)
    const pesos = materiales.map((m) => {
      const factorAleatorio = 0.8 + Math.random() * 0.4; // Genera entre 0.8 y 1.2
      return (1 / m.precio) * factorAleatorio;
    });
    const sumaPesos = pesos.reduce((acc, p) => acc + p, 0);

    // 3. REPARTO PROPORCIONAL (Ajustando a 1 decimal en cantidad)
    for (let i = 0; i < resultados.length; i++) {
      const proporcion = pesos[i] / sumaPesos;
      const montoTeorico = presupuestoRestante * proporcion;

      // Calculamos cuántas unidades extra podemos comprar con ese monto
      // y redondeamos a 1 decimal según la condición 5
      let cantidadExtra =
        Math.floor((montoTeorico / resultados[i].precio) * 10) / 10;

      resultados[i].cantidad = this.redondearUnDecimal(
        resultados[i].cantidad + cantidadExtra,
      );
      resultados[i].subtotal = this.redondearCentimos(
        resultados[i].precio * resultados[i].cantidad,
      );
    }

    // 4. AJUSTE FINAL INTELIGENTE PARA COINCIDIR EXACTO (Condición 1)
    this.ajusteFinalproporcional(resultados, presupuestoTotal);

    return resultados;
  }

  /**
   * Redondea un número a 2 decimales (céntimos) de forma segura
   */
  private redondearCentimos(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  /**
   * Redondea un número a 1 decimal (unidades)
   */
  private redondearUnDecimal(valor: number): number {
    return Math.round(valor * 10) / 10;
  }

  /**
   * Ajuste final proporcionado que respeta: mínimo 0.1, máximo 1 decimal, preferencia por valores enteros
   */
  private ajusteFinalproporcional(
    resultados: ResultadoDistribucion[],
    presupuestoTotal: number,
  ): void {
    let iteraciones = 0;
    const maxIteraciones = 1000;

    while (iteraciones < maxIteraciones) {
      const subtotalActual = resultados.reduce((acc, r) => acc + r.subtotal, 0);
      const diferencia = this.redondearCentimos(
        presupuestoTotal - subtotalActual,
      );

      // Si ya coincide exactamente, terminamos
      if (Math.abs(diferencia) < 0.001) {
        return;
      }

      const sobrante = diferencia > 0; // true si sobra presupuesto, false si falta

      if (sobrante) {
        // Hay presupuesto sobrante: intentar aumentar cantidades, priorizando por precio (baratos primero)
        const materialesOrdenados = resultados
          .map((m, idx) => ({ material: m, idx, precio: m.precio }))
          .sort((a, b) => a.precio - b.precio); // Materiales baratos primero

        let ajustado = false;

        for (const { material, idx } of materialesOrdenados) {
          // Intentar aumentar en 0.1 si es posible
          if (material.cantidad < 9.9) {
            const nuevaCantidad = this.redondearUnDecimal(
              material.cantidad + 0.1,
            );
            const nuevoSubtotal = this.redondearCentimos(
              material.precio * nuevaCantidad,
            );
            const incremento = this.redondearCentimos(
              nuevoSubtotal - material.subtotal,
            );

            if (incremento <= diferencia + 0.001) {
              material.cantidad = nuevaCantidad;
              material.subtotal = nuevoSubtotal;
              ajustado = true;
              break;
            }
          }
        }

        // Si no se pudo ajustar, intentar aumentar decimales finos
        if (!ajustado) {
          for (const { material } of materialesOrdenados) {
            if (material.cantidad < 9.9) {
              const cambio = Math.min(
                diferencia / material.precio,
                9.9 - material.cantidad,
              );
              material.cantidad = this.redondearUnDecimal(
                material.cantidad + this.redondearUnDecimal(cambio),
              );
              material.subtotal = this.redondearCentimos(
                material.precio * material.cantidad,
              );
              break;
            }
          }
        }
      } else {
        // Hay presupuesto insuficiente: intentar disminuir cantidades, priorizando por precio (baratos primero)
        const materialesOrdenados = resultados
          .map((m, idx) => ({ material: m, idx, precio: m.precio }))
          .sort((a, b) => a.precio - b.precio); // Materiales baratos primero

        let ajustado = false;

        for (const { material } of materialesOrdenados) {
          // Intentar disminuir en 0.1, pero manteniendo mínimo 0.1
          if (material.cantidad > 0.1) {
            const nuevaCantidad = this.redondearUnDecimal(
              material.cantidad - 0.1,
            );
            if (nuevaCantidad >= 0.1) {
              const nuevoSubtotal = this.redondearCentimos(
                material.precio * nuevaCantidad,
              );
              const decremento = this.redondearCentimos(
                material.subtotal - nuevoSubtotal,
              );

              if (decremento <= Math.abs(diferencia) + 0.001) {
                material.cantidad = nuevaCantidad;
                material.subtotal = nuevoSubtotal;
                ajustado = true;
                break;
              }
            }
          }
        }

        // Si no se pudo ajustar, intentar disminuir decimales finos
        if (!ajustado) {
          for (const { material } of materialesOrdenados) {
            if (material.cantidad > 0.1) {
              const cambio = Math.min(
                Math.abs(diferencia) / material.precio,
                material.cantidad - 0.1,
              );
              material.cantidad = this.redondearUnDecimal(
                material.cantidad - this.redondearUnDecimal(cambio),
              );
              if (material.cantidad < 0.1) material.cantidad = 0.1;
              material.subtotal = this.redondearCentimos(
                material.precio * material.cantidad,
              );
              break;
            }
          }
        }
      }

      iteraciones++;
    }

    // Ajuste final de residuales: asegurar que sea exacto
    const subtotalFinal = resultados.reduce((acc, r) => acc + r.subtotal, 0);
    const residualFinal = this.redondearCentimos(
      presupuestoTotal - subtotalFinal,
    );

    if (residualFinal !== 0) {
      // Aplicar residual al material más barato
      const materialMasBarato = resultados.reduce((prev, curr) =>
        curr.precio < prev.precio ? curr : prev,
      );

      if (materialMasBarato.cantidad > 0.1 || residualFinal > 0) {
        materialMasBarato.subtotal = this.redondearCentimos(
          materialMasBarato.subtotal + residualFinal,
        );
        materialMasBarato.cantidad = this.redondearCentimos(
          materialMasBarato.subtotal / materialMasBarato.precio,
        );
      }
    }
  }
}
