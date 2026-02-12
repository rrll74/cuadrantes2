# Funcionalidad: Consulta de Cuadrantes Históricos

## Descripción

Esta funcionalidad permite consultar los cuadrantes de trabajo de empleados en periodos específicos, utilizando la base de datos antigua (old database). Incluye generación de PDF y envío por email.

## Características Implementadas

### Backend (API)

#### Entities Creadas

- **OldEmpleado**: Información de trabajadores
- **OldCuadrante**: Cuadrantes de departamentos
- **OldCuadranteEmpleado**: Asignación de empleados a cuadrantes
- **OldAsignacion**: Estados de trabajo por día
- **OldEstado**: Estados de trabajo con colores y horarios
- **OldPuesto**: Puestos de trabajo
- **OldContrato**: Contratos de empleados

#### Servicios y Endpoints

**ConsultaCuadrantesService** - Servicios principales:

- `obtenerEmpleados()`: Lista de empleados activos ordenados por nombre
- `obtenerCuadrantesDisponibles()`: Cuadrantes disponibles según puestos en el periodo
- `obtenerConsultaCuadrante()`: Datos completos de asignaciones
- `generarPDF()`: Genera PDF con tabla de asignaciones y leyenda
- `generarYEnviarPDF()`: Genera y envía PDF por email (requiere configuración)

**Endpoints disponibles:**

- `GET /consulta-cuadrantes/empleados`
- `POST /consulta-cuadrantes/cuadrantes-disponibles`
- `POST /consulta-cuadrantes/consultar`
- `POST /consulta-cuadrantes/generar-pdf`
- `POST /consulta-cuadrantes/enviar-pdf-email`

### Frontend (Gestion)

**Página:** `/dashboard/consulta-cuadrantes`

**Funcionalidades:**

1. Selector de empleado ordenado alfabéticamente
2. Selector de periodo (mes/año inicio y fin)
3. Carga dinámica de cuadrantes disponibles
4. Selector de tipo de cuadrante (inicial/modificado)
5. Tabla visual con colores de fondo y texto según estados
6. Leyenda de estados con descripción y horarios
7. Botón para descargar PDF
8. Botón para enviar PDF por email (si el empleado tiene email)

### DTOs Compartidos (shared-dto)

- `EmpleadoSimpleDto`
- `DepartamentoDto`
- `CuadranteDisponibleDto`
- `EstadoTrabajoDto`
- `AsignacionDiaDto`
- `MesAsignacionesDto`
- `ConsultaCuadranteResponseDto`
- `ConsultaCuadranteRequestDto`
- `CuadrantesDisponiblesRequestDto`
- `GenerarPdfRequestDto`
- Constante: `NOMBRES_MESES`

## Dependencias Necesarias

### Backend

Para la generación de PDF se requiere instalar `pdfkit`:

```bash
cd apps/api
npm install pdfkit
npm install --save-dev @types/pdfkit
```

**Opcional**: Para envío de email (no implementado completamente):

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### Frontend

No requiere dependencias adicionales. Utiliza Material-UI que ya está instalado.

## Configuración

### Variables de Entorno

Asegúrese de tener configuradas las variables de la base de datos old en `.env.development.local`:

```env
DB_OLD_HOST=localhost
DB_OLD_PORT=3306
DB_OLD_USERNAME=root
DB_OLD_PASSWORD=password
DB_OLD_DATABASE=cuadrantes
```

### Email (Opcional)

Para habilitar el envío de emails, configure las siguientes variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

Y actualice el método `generarYEnviarPDF()` en `consulta-cuadrantes.service.ts` para usar nodemailer.

## Uso

### Desde el Frontend

1. Acceda a `/dashboard/consulta-cuadrantes`
2. Seleccione un empleado
3. Defina el periodo de consulta (mes y año inicio/fin)
4. Los cuadrantes disponibles se cargarán automáticamente
5. Seleccione un cuadrante
6. Elija el tipo (inicial o modificado)
7. Haga clic en "Buscar"
8. Revise la tabla de asignaciones y la leyenda
9. Use los botones para generar PDF o enviarlo por email

### Desde la API (Swagger)

Acceda a `http://localhost:3101/api` para ver la documentación interactiva de los endpoints bajo el tag "Consulta Cuadrantes (Old)".

## Estructura de Archivos

```
apps/
├── api/src/oldatabase/
│   ├── empleados/entities/oldempleado.entity.ts
│   ├── cuadrantes/entities/oldcuadrante.entity.ts
│   ├── cuadrantes-empleados/entities/oldcuadrante-empleado.entity.ts
│   ├── asignaciones/entities/oldasignacion.entity.ts
│   ├── estados/entities/oldestado.entity.ts
│   ├── puestos/entities/oldpuesto.entity.ts
│   ├── contratos/entities/oldcontrato.entity.ts
│   └── consulta-cuadrantes/
│       ├── consulta-cuadrantes.module.ts
│       ├── consulta-cuadrantes.service.ts
│       └── consulta-cuadrantes.controller.ts
│
└── gestion/src/app/dashboard/
    └── consulta-cuadrantes/
        └── page.tsx

packages/shared-dto/src/
└── consulta-cuadrantes.dto.ts
```

## Lógica de Negocio

### Obtención de Cuadrantes Disponibles

1. Busca contratos del empleado que se solapen con el periodo
2. Obtiene puestos asociados a esos contratos en el periodo
3. Extrae los departamentos de esos puestos
4. Filtra cuadrantes donde el empleado está asignado y pertenecen a esos departamentos

### Construcción de la Tabla

- Las filas representan meses (formato "Mes Año")
- Las columnas representan días (1-31)
- Cada celda muestra la abreviatura del estado con colores de texto y fondo
- Los meses sin días (ej: día 31 en febrero) se muestran vacíos

### Generación de PDF

- Formato A4 horizontal
- Incluye encabezado con datos del empleado y cuadrante
- Tabla con colores RGB convertidos a hexadecimal
- Leyenda con todos los estados utilizados
- Máximo 3 meses por página para legibilidad

## Notas Técnicas

- La base de datos old usa el connection name `'old'` en TypeORM
- Los colores se almacenan como enteros RGB que se convierten a hex
- El campo `ini0_mod1` en asignaciones indica: 0 = inicial, 1 = modificado
- La tabla de asignaciones tiene índices para optimizar consultas por fecha/empleado

## Próximos Pasos / Mejoras Futuras

1. Implementar completamente el envío de email con nodemailer
2. Agregar filtros adicionales (por departamento, por estado)
3. Permitir exportación a Excel además de PDF
4. Agregar gráficos de resumen (horas trabajadas, descansos, etc.)
5. Implementar caché para mejorar rendimiento en consultas repetidas
6. Agregar tests unitarios y e2e para la funcionalidad

## Soporte

Para reportar problemas o sugerencias, contacte al equipo de desarrollo.
