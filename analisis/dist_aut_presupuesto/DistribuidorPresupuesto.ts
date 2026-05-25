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
  public distribuir(presupuestoTotal: number, materiales: Material[]): ResultadoDistribucion[] {
    if (materiales.length === 0) throw new Error("La lista de materiales no puede estar vacía.");

    const n = materiales.length;
    let presupuestoRestante = presupuestoTotal;

    // 1. ASIGNACIÓN MÍNIMA OBLIGATORIA (0.1 unidades por material)
    const resultados: ResultadoDistribucion[] = materiales.map(m => {
      const cantidadMinima = 0.1;
      const subtotalMinimo = this.redondearCentimos(m.precio * cantidadMinima);
      presupuestoRestante -= subtotalMinimo;
      
      return {
        ...m,
        cantidad: cantidadMinima,
        subtotal: subtotalMinimo
      };
    });

    if (presupuestoRestante < 0) {
      throw new Error("El presupuesto es insuficiente para cubrir el mínimo de 0.1 unidades por material.");
    }

    // 2. CÁLCULO DE PESOS INVERSOS CON ALEATORIEDAD
    // Cuanto más barato, más peso (1/precio)
    const pesos = materiales.map(m => {
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
      let cantidadExtra = Math.floor((montoTeorico / resultados[i].precio) * 10) / 10;
      
      resultados[i].cantidad = this.redondearUnDecimal(resultados[i].cantidad + cantidadExtra);
      resultados[i].subtotal = this.redondearCentimos(resultados[i].precio * resultados[i].cantidad);
    }

    // 4. AJUSTE FINAL PARA COINCIDIR HASTA EL ÚLTIMO CÉNTIMO (Condición 1)
    const subtotalActual = resultados.reduce((acc, r) => acc + r.subtotal, 0);
    let diferencia = this.redondearCentimos(presupuestoTotal - subtotalActual);

    // Aplicamos la diferencia al último elemento para cuadrar el presupuesto
    // Nota: Para que el céntimo cuadre exacto, la última cantidad podría tener más de 1 decimal
    // si el precio del material no es amigo de los divisores de 0.1
    const ultimoIdx = resultados.length - 1;
    const ajusteCantidad = diferencia / resultados[ultimoIdx].precio;
    
    resultados[ultimoIdx].cantidad += ajusteCantidad;
    // Recalculamos el último subtotal sumando la diferencia exacta
    resultados[ultimoIdx].subtotal = this.redondearCentimos(resultados[ultimoIdx].subtotal + diferencia);

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
}