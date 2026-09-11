/**
 * Test del nuevo algoritmo de distribución de presupuesto con ajuste final exacto
 */

import {
  DistribuidorPresupuesto,
  Material,
  ResultadoDistribucion,
} from "./DistribuidorPresupuesto";

/**
 * Valida que el resultado cumple todas las restricciones
 */
function validarResultado(
  resultado: ResultadoDistribucion[],
  presupuestoTotal: number,
): {
  valido: boolean;
  errores: string[];
} {
  const errores: string[] = [];

  // 1. Verificar que el total cuadra exacto
  const total =
    Math.round(resultado.reduce((acc, r) => acc + r.subtotal, 0) * 100) / 100;
  if (Math.abs(total - presupuestoTotal) > 0.01) {
    errores.push(
      `❌ Total NO cuadra: esperado ${presupuestoTotal.toFixed(2)}€, obtenido ${total.toFixed(2)}€ (diferencia: ${(total - presupuestoTotal).toFixed(2)}€)`,
    );
  } else {
    console.log(`✅ Total cuadra exacto: ${total.toFixed(2)}€`);
  }

  // 2. Verificar que cada material tiene mínimo 0.1 unidades
  for (const material of resultado) {
    if (material.cantidad < 0.1 - 0.001) {
      errores.push(
        `❌ Material ${material.codigo} tiene cantidad ${material.cantidad.toFixed(2)} < 0.1`,
      );
    }
  }

  // 3. Verificar que las cantidades no exceden 1 decimal
  for (const material of resultado) {
    const decimales = (material.cantidad.toString().split(".")[1] || "").length;
    if (decimales > 1) {
      errores.push(
        `❌ Material ${material.codigo} tiene ${decimales} decimales: ${material.cantidad} (máximo 1 permitido)`,
      );
    }
  }

  // 4. Verificar que los subtotales sean correctos
  for (const material of resultado) {
    const calculado =
      Math.round(material.precio * material.cantidad * 100) / 100;
    if (Math.abs(calculado - material.subtotal) > 0.01) {
      errores.push(
        `❌ Material ${material.codigo}: subtotal incorrecto (${material.precio} * ${material.cantidad} = ${calculado.toFixed(2)}, pero reporta ${material.subtotal.toFixed(2)})`,
      );
    }
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * Analiza la distribución para ver patrones de cantidades
 */
function analizarDistribucion(resultado: ResultadoDistribucion[]): void {
  console.log("\n📊 Análisis de la distribución:");

  const cantidadesEnteras = resultado.filter(
    (r) => r.cantidad % 1 === 0,
  ).length;
  const cantidadesMedias = resultado.filter(
    (r) => (r.cantidad * 10) % 5 === 0 && r.cantidad % 1 !== 0,
  ).length;
  const cantidadesDecimales = resultado.filter(
    (r) => (r.cantidad * 10) % 1 !== 0 && (r.cantidad * 10) % 5 !== 0,
  ).length;

  console.log(`  • Cantidades enteras: ${cantidadesEnteras}`);
  console.log(`  • Cantidades .5: ${cantidadesMedias}`);
  console.log(`  • Cantidades con decimales: ${cantidadesDecimales}`);
}

/**
 * Ejecuta un test completo
 */
function ejecutarTest(
  nombre: string,
  presupuesto: number,
  materiales: Material[],
): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🧪 Test: ${nombre}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Presupuesto: ${presupuesto.toFixed(2)}€`);
  console.log(`Materiales: ${materiales.length}`);

  try {
    const distribuidor = new DistribuidorPresupuesto();
    const resultado = distribuidor.distribuir(presupuesto, materiales);

    console.log("\n📋 Resultado:");
    const tabla = resultado.map((r) => ({
      Código: r.codigo,
      Descripción: r.descripcion,
      "Precio €": r.precio.toFixed(2),
      Cantidad: r.cantidad.toFixed(1),
      "Subtotal €": r.subtotal.toFixed(2),
    }));
    console.table(tabla);

    const total = resultado.reduce((acc, r) => acc + r.subtotal, 0);
    console.log(`\n💰 Total gastado: ${total.toFixed(2)}€`);

    const validacion = validarResultado(resultado, presupuesto);
    if (!validacion.valido) {
      console.log("\n⚠️  Errores encontrados:");
      validacion.errores.forEach((error) => console.log(`  ${error}`));
    } else {
      console.log("\n✅ ¡Validación completada con éxito!");
    }

    analizarDistribucion(resultado);
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

// ============================================
// PRUEBAS
// ============================================

console.log("🚀 SUITE DE PRUEBAS - ALGORITMO MEJORADO\n");

// Test 1: Caso básico (presupuesto simple)
ejecutarTest("Presupuesto simple con 4 materiales", 1500.0, [
  { codigo: "MAT01", descripcion: "Arena fina", precio: 12.5 },
  { codigo: "MAT02", descripcion: "Cemento gris", precio: 45.8 },
  { codigo: "MAT03", descripcion: "Ladrillo cerámico", precio: 0.85 },
  { codigo: "MAT04", descripcion: "Pintura blanca", precio: 85.0 },
]);

// Test 2: Presupuesto ajustado
ejecutarTest("Presupuesto bajo (prueba de mínimos)", 100.0, [
  { codigo: "MAT01", descripcion: "Producto A", precio: 25.0 },
  { codigo: "MAT02", descripcion: "Producto B", precio: 30.0 },
  { codigo: "MAT03", descripcion: "Producto C", precio: 15.0 },
]);

// Test 3: Presupuesto con precios decimales complicados
ejecutarTest("Precios decimales complicados", 500.0, [
  { codigo: "MAT01", descripcion: "Material 1", precio: 12.33 },
  { codigo: "MAT02", descripcion: "Material 2", precio: 7.77 },
  { codigo: "MAT03", descripcion: "Material 3", precio: 99.99 },
]);

// Test 4: Muchos materiales
ejecutarTest("Distribución con muchos materiales", 2000.0, [
  { codigo: "M01", descripcion: "Material 1", precio: 10.0 },
  { codigo: "M02", descripcion: "Material 2", precio: 15.0 },
  { codigo: "M03", descripcion: "Material 3", precio: 20.0 },
  { codigo: "M04", descripcion: "Material 4", precio: 25.0 },
  { codigo: "M05", descripcion: "Material 5", precio: 30.0 },
  { codigo: "M06", descripcion: "Material 6", precio: 5.0 },
]);

console.log(`\n${"=".repeat(60)}\n✅ Todas las pruebas completadas\n`);
