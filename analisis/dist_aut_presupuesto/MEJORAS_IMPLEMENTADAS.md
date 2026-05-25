# Algoritmo Final Implementado - Distribucion Automatica de Presupuesto

Documento de referencia final del algoritmo que se ejecuta actualmente en frontend (gestion).

## 1. Alcance y ubicacion real

- Implementacion activa: apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/algoritmo.ts
- Pruebas unitarias del algoritmo: apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/algoritmo.spec.ts
- Objetivo funcional:
  - repartir un presupuesto objetivo entre materiales,
  - garantizar minimo de 0.1 unidades por material,
  - mantener unidades con un decimal,
  - y cerrar la diferencia contra el presupuesto objetivo.

## 2. Entradas y salida

### Entrada

- materials: lista de materiales, cada uno con:
  - codigo (opcional)
  - descripcion
  - precioUnitario
  - rowNumber
- presupuestoObjetivo: numero en euros

### Salida

- rows: lista de resultados por material con:
  - unidades
  - subtotal
  - peso
- summary:
  - presupuestoObjetivo
  - subtotalCalculado
  - diferencia
  - ajusteFinalAplicado

## 3. Reglas de negocio aplicadas

1. Cada material arranca con minimo obligatorio de 0.1 unidades.
2. Si el presupuesto no cubre esos minimos, se devuelve error.
3. El reparto principal usa peso inverso al precio (material barato pesa mas), con factor aleatorio de variacion.
4. Las unidades del reparto principal se limitan a 1 decimal.
5. Se ejecuta un ajuste final iterativo para reducir la diferencia frente al presupuesto objetivo.

## 4. Utilidades numericas

- roundToTwoDecimals(valor): redondeo a 2 decimales.
- roundToOneDecimal(valor): redondeo a 1 decimal.
- EPSILON = 0.001 para comparaciones de flotantes.
- roundByPreference(valor):
  - redondea a 1 decimal,
  - y si queda cerca de entero, fuerza entero para favorecer valores mas naturales.

## 5. Flujo completo del algoritmo

## 5.1 Inicializacion minima

Para cada material:

- unidades = 0.1
- subtotal = roundToTwoDecimals(precioUnitario \* 0.1)
- peso = 0

Se calcula subtotalInicialTotal y despues:

- presupuestoRestante = roundToTwoDecimals(presupuestoObjetivo - subtotalInicialTotal)

Si presupuestoRestante < 0, se lanza:

"El presupuesto es insuficiente para cubrir el minimo de 0.1 unidades por material."

## 5.2 Reparto proporcional inicial

1. Para cada material se genera factor aleatorio entre 0.8 y 1.2.
2. Peso por material:

   peso = (1 / precioUnitario) \* factorAleatorio

3. Proporcion por material:

   proporcion = peso / sumaPesos

4. Dinero teorico asignado:

   moneyShare = presupuestoRestante \* proporcion

5. Unidades extra (sin pasarse):

   extraUnits = floor((moneyShare / precioUnitario) \* 10) / 10

6. Resultado por material:

- unidades = roundToOneDecimal(0.1 + extraUnits)
- subtotal = roundToTwoDecimals(unidades \* precioUnitario)

## 5.3 Ajuste final iterativo

Se ejecuta aplicarAjusteFinalExacto(rows, presupuestoObjetivo).

### Orden de prioridad de materiales

- Se trabaja sobre una vista ordenada por precioUnitario ascendente.
- La estrategia prioriza materiales baratos porque permiten ajuste mas fino del total.

### Bucle principal

- maxIteraciones = 1000
- En cada iteracion:
  - subtotalCalculado = suma de subtotales
  - diferencia = presupuestoObjetivo - subtotalCalculado
  - si abs(diferencia) < EPSILON, termina

### Estrategias de ajuste por iteracion

Se prueban en este orden:

1. aplicarDeltaConPaso:
   - si diferencia > 0, intenta +0.1 unidades
   - si diferencia < 0, intenta -0.1 unidades
   - solo acepta cambios que no empeoran la condicion de no pasarse del ajuste permitido.

2. aplicarAjusteFino:
   - calcula delta = diferencia / precioUnitario y aplica roundByPreference.
   - respeta minimo 0.1 en reducciones.
   - acepta el cambio si reduce de forma valida la diferencia.

3. aplicarMejorMovimiento:
   - evalua candidatos +/-0.1 para todos los materiales validos.
   - elige el candidato con menor valor absoluto de nueva diferencia.
   - aplica solo si mejora respecto al estado actual.

Si ninguna estrategia logra mejorar, se rompe el bucle.

## 5.4 Cierre residual

Tras el bucle:

- residualFinal = presupuestoObjetivo - subtotalPreResidual

Si abs(residualFinal) >= EPSILON y es viable:

- se aplica residualFinal al subtotal del material mas barato,
- ajusteFinalAplicado = true.

Con esto se recalcula summary con:

- subtotalCalculado final
- diferencia final

## 6. Pseudocodigo del estado final

```text
distribuirPresupuesto(materials, presupuestoObjetivo):
   validar materials no vacio
   crear filas base con 0.1 unidades
   calcular presupuestoRestante
   validar presupuestoRestante >= 0

   calcular pesos inversos con factor aleatorio [0.8, 1.2]
   repartir presupuestoRestante proporcionalmente
   limitar unidades a 1 decimal

   ejecutar ajuste final iterativo:
      while iteraciones < 1000:
         recalcular diferencia
         if diferencia ~ 0: terminar
         intentar ajuste por paso (+/-0.1)
         si falla, intentar ajuste fino
         si falla, intentar mejor movimiento +/-0.1
         si no mejora, romper

      aplicar cierre residual al material mas barato (si procede)

   devolver rows + summary
```

## 7. Complejidad y comportamiento

- Reparto inicial: O(n)
- Ajuste final por iteracion:
  - aplicarDeltaConPaso: O(n)
  - aplicarAjusteFino: O(n)
  - aplicarMejorMovimiento: O(n)
- Total: O(k \* n), siendo k numero de iteraciones (acotado por 1000)

## 8. Validacion automatica existente

Las pruebas unitarias cubren actualmente:

1. Error con lista vacia.
2. Error por presupuesto insuficiente para minimos.
3. Minimo 0.1 por material.
4. Variabilidad por aleatoriedad en pesos.
5. Caso de cierre con diferencia final cero.
6. Unidades con un decimal y minimo 0.1.

Archivo de pruebas:

- apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/algoritmo.spec.ts

## 9. Observaciones tecnicas importantes

1. El algoritmo mantiene no determinismo por uso de Math.random() en pesos.
2. El ajuste final trabaja sobre subtotales ya redondeados a centimos.
3. En el cierre residual final se corrige el subtotal del material mas barato para reducir o eliminar la diferencia.
4. La bandera ajusteFinalAplicado indica que hubo intervencion en fase de cierre.

## 10. Recomendaciones de evolucion

1. Introducir semilla opcional para reproducibilidad completa.
2. Registrar trazas de iteraciones en modo diagnostico.
3. Añadir test de no regresion con dataset real de produccion anonimizado.
4. Valorar exponer metrica de numero de iteraciones en summary.
