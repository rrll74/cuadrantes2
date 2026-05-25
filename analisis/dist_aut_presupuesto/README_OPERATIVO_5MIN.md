# README Operativo 5 Min

## Objetivo

Arrancar y validar rapidamente la funcionalidad de distribucion automatica de presupuesto en otro dispositivo.

## 1) Requisitos minimos

1. Node.js 20.x.
2. npm disponible.
3. Repositorio completo clonado.

## 2) Arranque rapido

Desde la raiz del monorepo:

```bash
npm ci
npm run build:shared
npm run dev:gestion
```

Comprobacion de build:

```bash
npm run build:gestion
```

## 3) Ruta funcional

Pantalla objetivo:

1. /dashboard/dist-aut-presupuesto

## 4) Permiso requerido

Permiso unico:

1. presupuesto:distribucion

Si no aparece la opcion en menu:

1. Arrancar API para ejecutar seed de permisos.
2. Verificar que el permiso existe en /permisos.
3. Asignar permiso al usuario desde gestion de usuarios.

## 5) Flujo funcional minimo a validar

1. Abrir la pantalla de distribucion.
2. Introducir presupuesto objetivo mayor que 0.
3. Seleccionar Excel con columnas:
   - descripcion (obligatoria)
   - precio_unitario (obligatoria)
   - codigo (opcional)
4. Ejecutar validacion/calculo.
5. Ver tabla de resultados y resumen.
6. Comprobar en resumen: objetivo, calculado y diferencia.
7. Probar exportar Excel.
8. Probar exportar PDF.

## 6) Validaciones clave esperadas

1. Sin presupuesto no permite calcular.
2. descripcion duplicada da error.
3. precio_unitario menor o igual a 0 da error.
4. Todos los materiales salen con minimo 0.1 unidades.
5. Las unidades se muestran con un decimal.
6. Hay variacion entre ejecuciones por aleatoriedad.
7. El cierre final reduce o elimina diferencia respecto al objetivo segun ajuste residual.

## 7) Tests del modulo

Specs principales:

1. src/app/dashboard/dist-aut-presupuesto/lib/parser.spec.ts
2. src/app/dashboard/dist-aut-presupuesto/lib/algoritmo.spec.ts
3. src/app/dashboard/dist-aut-presupuesto/lib/export-excel.spec.ts
4. src/app/dashboard/dist-aut-presupuesto/lib/export-pdf.spec.ts
5. src/app/dashboard/dist-aut-presupuesto/page.spec.tsx
6. src/app/dashboard/dist-aut-presupuesto/components/DistribucionPresupuestoForm.spec.tsx

Ejecutar tests (desde raiz):

```bash
npm run test:gestion
```

## 8) Archivos clave del modulo

1. apps/gestion/src/app/dashboard/dist-aut-presupuesto/page.tsx
2. apps/gestion/src/app/dashboard/dist-aut-presupuesto/components/DistribucionPresupuestoForm.tsx
3. apps/gestion/src/app/dashboard/dist-aut-presupuesto/components/DistribucionResultadosTable.tsx
4. apps/gestion/src/app/dashboard/dist-aut-presupuesto/hooks/useDistribucionPresupuesto.ts
5. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/parser.ts
6. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/algoritmo.ts
7. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/export-excel.ts
8. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/export-pdf.ts

## 9) Estado actual

1. Implementacion funcional operativa en frontend.
2. Documentacion de algoritmo consolidada en analisis/dist_aut_presupuesto/MEJORAS_IMPLEMENTADAS.md.
3. Pendiente: validacion funcional final con negocio en casos reales.

## 10) Siguiente accion recomendada

1. Ejecutar validacion funcional con 3 ficheros reales y cerrar aceptacion de negocio.
