# Documento Maestro de Implementación

## Funcionalidad

Distribución automática de presupuesto a partir de un fichero Excel de materiales, ejecutada en frontend, sin persistencia en base de datos.

## Decisiones funcionales cerradas

1. La funcionalidad se implementa en frontend dentro del dashboard.
2. Se añade una nueva opción de menú para acceder a la funcionalidad.
3. Se crea un único permiso para permitir el acceso completo a la funcionalidad.
4. El presupuesto objetivo se introduce obligatoriamente como input en el formulario.
5. Sin presupuesto objetivo no se permite calcular ni exportar.
6. La aleatoriedad forma parte del algoritmo y queda activada por defecto.
7. Dos ejecuciones con la misma entrada pueden dar resultados diferentes.
8. La clave de identificación de cada material es el campo descripcion.
9. El campo codigo puede venir vacío y no se utiliza como clave de negocio.
10. Cada material debe tener cantidad mínima de 0.1 unidades.
11. Se mantiene salida en Excel y PDF.

## Aclaraciones de reglas de datos

1. Entrada mínima por fila: descripcion y precio_unitario válidos.
2. codigo es opcional.
3. descripcion debe ser obligatoria y única por fila tras normalización (trim y colapsado de espacios).
4. precio_unitario debe ser numérico y mayor que 0.
5. Si un precio viene 0 o negativo, se rechaza la fila como error de formato.

## Contrato funcional propuesto

### Entrada

- Fichero Excel con columnas:
  - codigo (opcional)
  - descripcion (obligatoria, clave)
  - precio_unitario (obligatoria)
- Campo formulario:
  - presupuesto_total (obligatorio)

### Salida

- Tabla de resultados en UI con columnas:
  - codigo
  - descripcion
  - precio_unitario
  - unidades
  - subtotal
- Resumen:
  - presupuesto objetivo
  - total distribuido
  - diferencia final
- Exportación:
  - Excel
  - PDF

## Diseño técnico (frontend)

### 1) Navegación y permisos

1. Añadir permiso nuevo en paquete compartido de permisos.
2. Incluir nuevo item en menú lateral del dashboard condicionado por permiso o admin.
3. Crear nueva ruta de dashboard para esta funcionalidad.
4. Proteger la página con control de permisos al entrar.

Permiso sugerido:

- tipo: presupuesto:distribucion
- descripcion: Distribución automática de presupuesto

### 2) Estructura de carpetas recomendada

Ruta base sugerida:

- apps/gestion/src/app/dashboard/dist-aut-presupuesto/

Archivos sugeridos:

1. page.tsx
2. components/DistribucionPresupuestoForm.tsx
3. components/DistribucionResultadosTable.tsx
4. hooks/useDistribucionPresupuesto.ts
5. lib/distribucion-presupuesto/types.ts
6. lib/distribucion-presupuesto/parser.ts
7. lib/distribucion-presupuesto/algoritmo.ts
8. lib/distribucion-presupuesto/export-excel.ts
9. lib/distribucion-presupuesto/export-pdf.ts
10. tests unitarios y de integración de los módulos anteriores

### 3) Flujo UI

1. Usuario accede a la pantalla con permiso válido.
2. Usuario carga Excel.
3. Usuario introduce presupuesto_total.
4. Sistema valida fichero y presupuesto.
5. Sistema ejecuta distribución con aleatoriedad.
6. Sistema muestra resultados y resumen económico.
7. Usuario exporta a Excel o PDF.

### 4) Validaciones UI obligatorias

1. Presupuesto vacío o menor/igual a 0: bloquear acciones.
2. Fichero no Excel: bloquear.
3. Cabeceras requeridas ausentes: error.
4. descripcion vacía: error.
5. descripcion duplicada: error.
6. precio_unitario no numérico o menor/igual a 0: error.
7. Presupuesto insuficiente para mínimos de 0.1 por material: error de negocio.

### 5) Motor de distribución

Requisitos del algoritmo:

1. Asignar mínimo de 0.1 unidades a cada material.
2. Calcular pesos inversos por precio con factor aleatorio.
3. Distribuir restante proporcionalmente por pesos.
4. Limitar unidades a una cifra decimal durante el reparto.
5. Ajustar al céntimo final del presupuesto objetivo.

Nota de implementación:
Cuando el ajuste final al céntimo entre en tensión con la restricción de una cifra decimal, priorizar que el total económico final cuadre exactamente y registrar en UI que hubo ajuste final de cierre.

### 6) Exportaciones

#### Excel

1. Hoja con resultados detallados.
2. Formato numérico de precio, unidades y subtotal.
3. Fila de totales.
4. Metadatos: fecha/hora de generación y presupuesto objetivo.

#### PDF

1. Resumen de ejecución.
2. Tabla paginada de resultados.
3. Totales al final.

## Plan de implementación por fases

### Fase 0 - Preparación

1. Confirmar naming final de ruta y permiso.
2. Añadir permiso en paquete shared-dto.
3. Reiniciar servicios para refrescar permisos en seed.

### Fase 1 - Pantalla base y guardas

1. Crear página en dashboard.
2. Integrar comprobación de permisos.
3. Añadir entrada en menú lateral.

### Fase 2 - Parsing y validación

1. Implementar parser Excel.
2. Implementar validaciones de estructura y contenido.
3. Mostrar errores detallados por fila/columna.

### Fase 3 - Algoritmo de distribución

1. Implementar motor basado en algoritmo actual.
2. Aplicar clave por descripcion.
3. Aplicar aleatoriedad en pesos.
4. Ajuste final de cierre al céntimo.

### Fase 4 - UI de resultados y exportación

1. Pintar tabla de resultados.
2. Añadir resumen económico.
3. Implementar exportación Excel.
4. Implementar exportación PDF.

### Fase 5 - Pruebas y endurecimiento

1. Unit tests parser.
2. Unit tests algoritmo.
3. Tests de componente de la pantalla.
4. Pruebas manuales con ficheros reales.

## Tareas tecnicas desglosadas por archivo

### A) Archivos existentes a modificar

#### 1) packages/shared-dto/src/permissions.const.ts

Cambios:

1. Agregar nuevo permiso en AVAILABLE_PERMISSIONS:

- tipo: presupuesto:distribucion
- descripcion: Distribucion automatica de presupuesto

2. Agregar nueva constante en PERMISSIONS:

- PRESUPUESTO_DISTRIBUCION: "presupuesto:distribucion"

Criterio de terminado:

1. El permiso aparece en el contrato compartido entre apps.
2. No rompe tipado de PermissionType.

#### 2) apps/gestion/src/app/dashboard/layout.tsx

Cambios:

1. Leer nuevo permiso con usePermissions(PERMISSIONS.PRESUPUESTO_DISTRIBUCION).
2. Crear bandera de visibilidad del menu con OR admin.
3. Agregar nuevo ListItem en drawer con enlace a /dashboard/dist-aut-presupuesto.

Criterio de terminado:

1. Solo usuarios con permiso (o admin) ven el acceso en menu.
2. Navegacion funcional a la nueva pantalla.

#### 3) apps/gestion/package.json

Cambios:

1. Agregar dependencia para lectura/escritura de Excel si no existe (xlsx).
2. Mantener jspdf como base para exportacion PDF (ya disponible).

Criterio de terminado:

1. Dependencias instaladas sin conflictos.
2. Build de gestion compila.

#### 4) apps/api/src/newdatabase/seeder.service.ts (validacion operativa)

Cambios:

1. Sin cambio de codigo obligatorio si se mantiene consumo de AVAILABLE_PERMISSIONS.
2. Verificar que al reiniciar API se inserta el nuevo permiso.

Criterio de terminado:

1. El permiso nuevo aparece en /permisos.
2. Puede asignarse desde gestion de usuarios.

### B) Archivos nuevos a crear (frontend)

#### 5) apps/gestion/src/app/dashboard/dist-aut-presupuesto/page.tsx

Responsabilidad:

1. Entrada principal de la funcionalidad.
2. Control de acceso por permiso unico.
3. Composicion del formulario y la tabla de resultados.

Tareas:

1. Mostrar aviso de "sin permisos" cuando corresponda.
2. Renderizar layout con titulo, descripcion, formulario y resultados.

Criterio de terminado:

1. Ruta protegida y accesible con permiso.

#### 6) apps/gestion/src/app/dashboard/dist-aut-presupuesto/components/DistribucionPresupuestoForm.tsx

Responsabilidad:

1. Captura de input de usuario.

Tareas:

1. Campo file para Excel.
2. Campo numerico presupuesto_total obligatorio.
3. Boton "Calcular" deshabilitado sin presupuesto valido o sin fichero valido.
4. Mensajes de error de validacion.

Criterio de terminado:

1. No permite ejecutar ninguna accion sin presupuesto.

#### 7) apps/gestion/src/app/dashboard/dist-aut-presupuesto/components/DistribucionResultadosTable.tsx

Responsabilidad:

1. Visualizacion de resultados.

Tareas:

1. Tabla con columnas codigo, descripcion, precio_unitario, unidades, subtotal.
2. Bloque de resumen economico (objetivo, distribuido, diferencia).
3. Indicador de ajuste final si aplica.

Criterio de terminado:

1. Datos y resumen coherentes con salida del algoritmo.

#### 8) apps/gestion/src/app/dashboard/dist-aut-presupuesto/hooks/useDistribucionPresupuesto.ts

Responsabilidad:

1. Orquestar parseo, validacion, calculo y estado.

Tareas:

1. Exponer acciones: parseFile, calcularDistribucion, reset.
2. Gestionar estados: loading, error, resultados, resumen.
3. Integrar parser y algoritmo.

Criterio de terminado:

1. Flujo completo controlado desde un unico hook testeable.

#### 9) apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/types.ts

Responsabilidad:

1. Tipos de dominio de la funcionalidad.

Tareas:

1. Definir MaterialInput, MaterialNormalizado, ResultadoDistribucion, ResumenDistribucion.
2. Definir tipos de error de validacion por fila/columna.

Criterio de terminado:

1. Tipado estable para parser, algoritmo y UI.

#### 10) apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/parser.ts

Responsabilidad:

1. Parsear y validar fichero Excel.

Tareas:

1. Leer primera hoja del Excel.
2. Validar cabeceras: descripcion y precio_unitario obligatorias; codigo opcional.
3. Normalizar descripcion y usarla como clave unica.
4. Validar precio_unitario numerico y > 0.
5. Devolver errores estructurados por fila.

Criterio de terminado:

1. Rechaza entradas invalidas con errores claros.
2. Entrega lista normalizada lista para algoritmo.

#### 11) apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/algoritmo.ts

Responsabilidad:

1. Implementar distribucion con aleatoriedad.

Tareas:

1. Aplicar minimo 0.1 por material.
2. Calcular pesos inversos con factor aleatorio.
3. Repartir restante con redondeo de unidades.
4. Ajustar cierre economico al centimo.
5. Exponer marca de ajuste final cuando sea necesario.

Criterio de terminado:

1. Total final cuadra con presupuesto objetivo al centimo.
2. Se observan variaciones entre ejecuciones.

#### 12) apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/export-excel.ts

Responsabilidad:

1. Generar fichero Excel de salida.

Tareas:

1. Crear hoja con columnas de entrada + unidades + subtotal.
2. Agregar fila de totales.
3. Descargar archivo desde navegador.

Criterio de terminado:

1. Excel descargable y legible para negocio.

#### 13) apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/export-pdf.ts

Responsabilidad:

1. Generar PDF de salida.

Tareas:

1. Generar cabecera con metadatos (fecha, presupuesto).
2. Renderizar tabla de resultados y total.
3. Descargar archivo PDF desde navegador.

Criterio de terminado:

1. PDF descargable y correcto en formato.

### C) Archivos nuevos a crear (tests)

#### 14) apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/parser.spec.ts

Tareas:

1. Caso feliz de parseo.
2. Falta de cabeceras obligatorias.
3. descripcion duplicada.
4. precio invalido.

#### 15) apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/algoritmo.spec.ts

Tareas:

1. Minimo 0.1 por material.
2. Ajuste final al centimo.
3. Presupuesto insuficiente.
4. Variabilidad por aleatoriedad entre ejecuciones.

#### 16) apps/gestion/src/app/dashboard/dist-aut-presupuesto/components/DistribucionPresupuestoForm.spec.tsx

Tareas:

1. Boton deshabilitado sin presupuesto.
2. Mensajes de validacion de presupuesto.
3. Emision de evento de calcular con datos validos.

#### 17) apps/gestion/src/app/dashboard/dist-aut-presupuesto/page.spec.tsx

Tareas:

1. Render con permiso.
2. Bloqueo sin permiso.
3. Flujo basico de pantalla.

### D) Tareas transversales de ejecucion

1. Ejecutar npm run build:shared para propagar nuevos permisos.
2. Ejecutar npm run dev o reiniciar API para seed del permiso.
3. Asignar permiso a usuario de pruebas desde gestion de usuarios.
4. Ejecutar npm run test:gestion.
5. Ejecutar npm run build:gestion.

## Orden recomendado de implementacion (secuencia corta)

1. Permisos compartidos y menu.
2. Ruta y pagina base con guardas.
3. Tipos + parser.
4. Algoritmo.
5. UI de resultados.
6. Exportaciones.
7. Tests.
8. Validacion funcional con ficheros reales.

## Checklist de ejecución

### Checklist de desarrollo

1. [x] Añadir permiso presupuesto:distribucion en shared-dto.
2. [x] Compilar/watch de shared-dto para propagar PERMISSIONS.
3. [x] Añadir item de menú en dashboard con control de permisos.
4. [x] Crear ruta dashboard para dist-aut-presupuesto.
5. [x] Implementar formulario con input obligatorio de presupuesto.
6. [x] Deshabilitar acciones sin presupuesto válido.
7. [x] Implementar carga y parseo de Excel.
8. [x] Validar columnas y calidad de datos.
9. [x] Tratar descripcion como clave única.
10. [x] Implementar algoritmo con aleatoriedad.
11. [x] Garantizar mínimo 0.1 unidades por material.
12. [x] Implementar ajuste de cierre económico al céntimo.
13. [x] Mostrar resultados y resumen de diferencias.
14. [x] Implementar exportación a Excel.
15. [x] Implementar exportación a PDF.
16. [x] Añadir tests unitarios del parser.
17. [x] Añadir tests unitarios del algoritmo.
18. [x] Añadir tests de interfaz y permisos.
19. [x] Ejecutar lint y test de gestión (build + tests focalizados del módulo).
20. [ ] Validación funcional con usuario de negocio.

### Checklist de aceptación funcional

1. [x] Usuario sin permiso no visualiza ni accede a la pantalla.
2. [x] Usuario con permiso accede y puede ejecutar flujo completo.
3. [x] Sin presupuesto informado no se puede calcular.
4. [x] Con presupuesto válido y Excel válido se generan resultados.
5. [x] Todos los materiales salen con al menos 0.1 unidades.
6. [ ] Total distribuido coincide con presupuesto objetivo al céntimo.
7. [x] Se observan variaciones entre ejecuciones por aleatoriedad.
8. [x] descripcion se respeta como identificador único de material.
9. [x] Exportación Excel correcta.
10. [x] Exportación PDF correcta.

## Estado actual de ejecución (25-05-2026)

Resumen:

1. Fases completadas técnicamente: Fase 1, Fase 2, Fase 3, Fase 4 y Fase 5.
2. Validación técnica ejecutada: build de gestión correcto y batería de tests del módulo en verde.
3. Pendiente principal: validación funcional de negocio con ficheros reales y cierre final de aceptación económica al céntimo en todos los casos de negocio.

Resultado de tests del módulo dist-aut-presupuesto:

1. 20 tests pasados, 0 fallidos.
2. Cobertura focalizada ejecutada.
3. Cobertura destacada:

- parser.ts: 83.5%
- algoritmo.ts: 98.2%
- export-excel.ts: 73.7%
- export-pdf.ts: 93.4%
- DistribucionPresupuestoForm.tsx: 79.3%
- page.tsx: 100%

## Archivos implementados y modificados

Permisos y navegación:

1. packages/shared-dto/src/permissions.const.ts
2. apps/gestion/src/app/dashboard/layout.tsx

Módulo de funcionalidad:

1. apps/gestion/src/app/dashboard/dist-aut-presupuesto/page.tsx
2. apps/gestion/src/app/dashboard/dist-aut-presupuesto/components/DistribucionPresupuestoForm.tsx
3. apps/gestion/src/app/dashboard/dist-aut-presupuesto/components/DistribucionResultadosTable.tsx
4. apps/gestion/src/app/dashboard/dist-aut-presupuesto/hooks/useDistribucionPresupuesto.ts
5. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/types.ts
6. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/parser.ts
7. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/algoritmo.ts
8. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/export-excel.ts
9. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/export-pdf.ts

Tests del módulo:

1. apps/gestion/src/app/dashboard/dist-aut-presupuesto/page.spec.tsx
2. apps/gestion/src/app/dashboard/dist-aut-presupuesto/components/DistribucionPresupuestoForm.spec.tsx
3. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/parser.spec.ts
4. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/algoritmo.spec.ts
5. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/export-excel.spec.ts
6. apps/gestion/src/app/dashboard/dist-aut-presupuesto/lib/export-pdf.spec.ts

## Guía de continuidad en otro dispositivo

### 1) Requisitos previos

1. Node.js 20.x (recomendado 20.16.0 LTS).
2. npm disponible.
3. Acceso al repositorio completo (monorepo).

### 2) Preparación inicial

1. Clonar repositorio.
2. Ejecutar instalación limpia en raíz:

- npm ci

3. Compilar paquete compartido:

- npm run build:shared

### 3) Variables de entorno mínimas

Frontend:

1. Revisar apps/gestion/example.env.production.local y crear el .env correspondiente.

API (si se valida permisos/seed):

1. Revisar apps/api/example.env.development.local.
2. Configurar conexión de base de datos y JWT.

### 4) Arranque recomendado para continuar

Desarrollo completo:

1. npm run dev

Solo frontend:

1. npm run dev:gestion

Solo compilación frontend:

1. npm run build:gestion

### 5) Validación de permisos en entorno nuevo

1. Asegurar que existe el permiso presupuesto:distribucion en la base de datos (seed al iniciar API).
2. Asignar el permiso al usuario de prueba desde gestión de usuarios.
3. Confirmar que aparece la opción de menú "Distribución de Presupuesto".

### 6) Ejecución de tests del módulo

1. Ejecutar tests focalizados:

- usar Jest sobre los 6 specs del módulo dist-aut-presupuesto.

2. Ejecutar cobertura focalizada del módulo para comprobar estado real tras mover de dispositivo.

### 7) Checklist de re-validación rápida en otro dispositivo

1. Acceso con permiso correcto al menú y página.
2. Carga de Excel con columnas correctas.
3. Validación de errores (duplicados, precio inválido, presupuesto inválido).
4. Cálculo de distribución con aleatoriedad.
5. Exportación Excel y exportación PDF.
6. Ejecución de tests del módulo sin fallos.

### 8) Pendientes para cierre final de proyecto

1. Validación funcional con usuario de negocio (casos reales).
2. Verificación manual de escenarios económicos límite donde la diferencia final no sea 0 por restricciones de redondeo.
3. Si negocio exige cierre exacto al céntimo en el 100% de escenarios, ajustar estrategia final de redondeo y actualizar tests.

## Riesgos y mitigaciones

1. Tensión entre redondeo a 1 decimal y ajuste exacto al céntimo.
   - Mitigación: política explícita de priorización económica y marca de ajuste final.
2. Entradas con formatos heterogéneos de decimal (coma/punto).
   - Mitigación: normalización estricta y mensajes de error claros.
3. Duplicados de descripcion por diferencias de espacios o mayúsculas.
   - Mitigación: normalización antes de validar unicidad.
4. Resultados no reproducibles por aleatoriedad.
   - Mitigación: incluir indicador visual de ejecución aleatoria y opción futura de semilla técnica si se requiere auditoría.

## Definición de terminado

1. Ruta accesible desde menú con permiso correcto.
2. Flujo completo operativo: cargar, validar, calcular, visualizar, exportar.
3. Tests mínimos aprobados y sin errores críticos de lint.
4. Aprobación funcional por negocio sobre 3 ficheros de ejemplo.
