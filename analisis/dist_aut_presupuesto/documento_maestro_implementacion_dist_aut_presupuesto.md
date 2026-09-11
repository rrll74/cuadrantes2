# Documento Maestro de Implementacion (Version Final Sincronizada)

## Objetivo

Consolidar la especificacion funcional y tecnica de la distribucion automatica de presupuesto segun la implementacion realmente desplegada en frontend.

## Fuente canonica de algoritmo

1. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/algoritmo.ts
2. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/algoritmo.spec.ts
3. analisis/dist_aut_presupuesto/MEJORAS_IMPLEMENTADAS.md

## Alcance funcional

1. Carga de Excel de materiales.
2. Introduccion de presupuesto objetivo.
3. Calculo de distribucion con reparto proporcional y ajuste final.
4. Visualizacion de resultados y resumen.
5. Exportacion a Excel y PDF.
6. Control de acceso por permiso.

## Reglas de negocio vigentes

1. Minimo obligatorio de 0.1 unidades por material.
2. Error si el presupuesto no cubre los minimos.
3. Reparto inicial con peso inverso al precio y factor aleatorio.
4. Ajuste final iterativo priorizando materiales baratos.
5. Cierre residual final para minimizar/cerrar diferencia economica.
6. Unidades con una cifra decimal durante reparto y ajustes iterativos.

## Flujo tecnico final

1. Parser valida columnas y datos de entrada.
2. Algoritmo crea base con 0.1 unidades por material.
3. Se reparte presupuesto restante por pesos inversos.
4. Se ejecuta ajuste final con tres estrategias:
   - ajuste por paso (+/-0.1),
   - ajuste fino,
   - mejor movimiento local.
5. Se aplica residual final sobre el material mas barato cuando procede.
6. Se devuelve resultado con summary de objetivo, subtotal, diferencia y bandera de ajuste.

## Archivos del modulo frontend

1. apps/gestion/src/app/dashboard/dist-aut-presupuesto/page.tsx
2. apps/gestion/src/app/dashboard/dist-aut-presupuesto/components/DistribucionPresupuestoForm.tsx
3. apps/gestion/src/app/dashboard/dist-aut-presupuesto/components/DistribucionResultadosTable.tsx
4. apps/gestion/src/app/dashboard/dist-aut-presupuesto/hooks/useDistribucionPresupuesto.ts
5. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/types.ts
6. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/parser.ts
7. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/algoritmo.ts
8. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/export-excel.ts
9. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/export-pdf.ts

## Pruebas recomendadas

1. Unit tests del modulo:
   - parser.spec.ts
   - algoritmo.spec.ts
   - export-excel.spec.ts
   - export-pdf.spec.ts
   - componentes y pagina.
2. Validacion funcional con ficheros reales de negocio.

## Operacion y permisos

1. Ruta: /dashboard/dist-aut-presupuesto
2. Permiso: presupuesto:distribucion
3. Sin permiso, no debe mostrarse ni ejecutarse la funcionalidad.

## Notas de gobierno documental

1. Este documento reemplaza las partes del maestro anterior que describian tareas de creacion inicial ya completadas.
2. Cualquier cambio en algoritmo debe actualizar primero:
   - apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/algoritmo.ts
   - apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/algoritmo.spec.ts
   - analisis/dist_aut_presupuesto/MEJORAS_IMPLEMENTADAS.md
3. Los archivos de analisis con implementaciones TypeScript de apoyo se consideran historicos y no fuente primaria de ejecucion.
