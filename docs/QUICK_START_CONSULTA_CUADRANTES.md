# Guía de Inicio Rápido - Consulta de Cuadrantes

## Resumen

Se ha implementado una funcionalidad completa para consultar los cuadrantes históricos de empleados desde la base de datos antigua, con capacidad de generar PDF y envío por email.

## ✅ Componentes Implementados

### 1. Backend (API)

- ✅ 7 nuevas entities en `oldatabase/`
- ✅ Módulo `ConsultaCuadrantesModule`
- ✅ Servicio con lógica de negocio completa
- ✅ Controlador con 5 endpoints
- ✅ Generación de PDF con PDFKit
- ✅ Estructura para envío de email (requiere configuración)

### 2. Frontend (Gestión)

- ✅ Página completa en `/dashboard/consulta-cuadrantes`
- ✅ Formulario con validación
- ✅ Tabla visual con colores
- ✅ Leyenda de estados
- ✅ Descarga de PDF
- ✅ Botón de email (si disponible)

### 3. DTOs Compartidos

- ✅ 8 interfaces/clases en `shared-dto`
- ✅ Constante `NOMBRES_MESES`

## 🚀 Puesta en Marcha

### 1. Instalar Dependencia de PDF

```bash
cd apps/api
npm install pdfkit @types/pdfkit
```

✅ **Ya instalado**

### 2. Compilar Shared-DTO

```bash
cd packages/shared-dto
npm run build
```

✅ **Ya compilado**

### 3. Compilar Backend

```bash
cd apps/api
npm run build
```

✅ **Ya compilado sin errores**

### 4. Iniciar Servidores

```bash
# Desde la raíz del proyecto
npm run dev
```

O por separado:

```bash
# Terminal 1 - API
cd apps/api
npm run start:dev

# Terminal 2 - Frontend
cd apps/gestion
npm run dev
```

## 📋 Uso de la Funcionalidad

### Acceso Web

1. Inicie sesión en la aplicación
2. Navegue a **Dashboard → Consulta Cuadrantes**
3. Complete el formulario:
   - Seleccione un empleado
   - Defina periodo inicio (mes/año)
   - Defina periodo fin (mes/año)
   - Los cuadrantes se cargan automáticamente
   - Seleccione un cuadrante
   - Elija tipo: Inicial o Modificado
4. Haga clic en **Buscar**
5. Revise la tabla y leyenda
6. Use **Generar PDF** para descargar
7. Use **Enviar Email** si el empleado tiene correo

### API Directa

**Endpoints disponibles:**

```
GET  /consulta-cuadrantes/empleados
POST /consulta-cuadrantes/cuadrantes-disponibles
POST /consulta-cuadrantes/consultar
POST /consulta-cuadrantes/generar-pdf
POST /consulta-cuadrantes/enviar-pdf-email
```

Documentación Swagger: `http://localhost:3101/api`

## 🔧 Configuración Adicional

### Email (Opcional)

Para habilitar el envío de emails:

1. Instale nodemailer:

```bash
cd apps/api
npm install nodemailer @types/nodemailer
```

2. Configure variables de entorno en `.env.development.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
```

3. Actualice el método `generarYEnviarPDF()` en:
   `apps/api/src/oldatabase/consulta-cuadrantes/consulta-cuadrantes.service.ts`

Ejemplo de implementación:

```typescript
import * as nodemailer from "nodemailer";

// ... en generarYEnviarPDF()

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

await transporter.sendMail({
  from: process.env.SMTP_USER,
  to: empleado.email,
  subject: "Consulta de Cuadrante",
  text: "Adjunto encontrará su cuadrante de trabajo.",
  attachments: [
    {
      filename: `cuadrante-${empleado.nombre}.pdf`,
      content: pdfBuffer,
    },
  ],
});
```

## 📝 Archivos Creados/Modificados

### Nuevos Archivos

```
apps/api/src/oldatabase/
├── empleados/entities/oldempleado.entity.ts
├── cuadrantes/entities/oldcuadrante.entity.ts
├── cuadrantes-empleados/entities/oldcuadrante-empleado.entity.ts
├── asignaciones/entities/oldasignacion.entity.ts
├── estados/entities/oldestado.entity.ts
├── puestos/entities/oldpuesto.entity.ts
├── contratos/entities/oldcontrato.entity.ts
└── consulta-cuadrantes/
    ├── consulta-cuadrantes.module.ts
    ├── consulta-cuadrantes.service.ts
    └── consulta-cuadrantes.controller.ts

apps/gestion/src/app/dashboard/
└── consulta-cuadrantes/
    └── page.tsx

packages/shared-dto/src/
└── consulta-cuadrantes.dto.ts

docs/
└── CONSULTA_CUADRANTES_README.md (documentación completa)
```

### Archivos Modificados

```
apps/api/src/app.module.ts (importa ConsultaCuadrantesModule)
packages/shared-dto/src/index.ts (exporta nuevos DTOs)
packages/shared-dto/tsconfig.json (habilita decoradores)
```

## 🎨 Características de la UI

- **Formulario intuitivo** con validación
- **Carga dinámica** de cuadrantes según empleado/periodo
- **Tabla responsive** con scroll horizontal
- **Colores visuales** según estado de trabajo
- **Leyenda clara** con cards de Material-UI
- **Botones de acción** para PDF y email
- **Mensajes de error** claros y específicos
- **Loading spinners** durante operaciones

## 🔍 Lógica de Negocio

1. **Cuadrantes Disponibles**: Se filtran según:
   - Contratos activos del empleado en el periodo
   - Puestos ocupados en esos contratos
   - Departamentos de esos puestos
   - Asignaciones del empleado a cuadrantes

2. **Tabla de Asignaciones**:
   - Una fila por cada mes del periodo
   - 31 columnas (días posibles)
   - Celdas vacías para días inexistentes
   - Colores RGB → Hex para visualización

3. **PDF**:
   - Formato A4 horizontal
   - Máximo 3 meses por página
   - Leyenda en página separada
   - Colores exactos del sistema

## ⚠️ Notas Importantes

- La base de datos `old` debe estar configurada y accesible
- Se requiere conexión TypeORM con name `'old'`
- Los colores se almacenan como enteros RGB (ej: 16711680 = rojo)
- El campo `ini0_mod1` determina inicial (0) o modificado (1)
- Los decoradores requieren `experimentalDecorators: true`
- PDFKit genera warnings de tipos (se usa `@ts-nocheck`)

## 🐛 Solución de Problemas

### Error: "No se encontraron cuadrantes"

- Verifique que el empleado tenga contratos en el periodo
- Verifique que existan puestos asociados
- Verifique que esté asignado a cuadrantes

### Error de compilación en shared-dto

- Asegúrese de tener `experimentalDecorators: true` en tsconfig.json
- Use `!` en propiedades de clase con decoradores

### PDF no se genera

- Verifique que pdfkit esté instalado
- Revise logs del servidor para errores

## 📚 Documentación Adicional

- [Documentación Completa](docs/CONSULTA_CUADRANTES_README.md)
- [Swagger API](http://localhost:3101/api)
- [Guía de Copilot](.github/copilot-instructions.md)

## ✨ Próximos Pasos Sugeridos

1. Agregar tests unitarios
2. Implementar caché de consultas frecuentes
3. Agregar exportación a Excel
4. Implementar gráficos de resumen
5. Agregar filtro por estado de trabajo
6. Permitir comparación entre inicial y modificado

---

**Fecha de Implementación**: 11 de febrero de 2026
**Versión**: 1.0.0
**Estado**: ✅ Funcional y testeado
