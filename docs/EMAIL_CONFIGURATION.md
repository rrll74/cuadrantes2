# Configuración de Envío de Emails - Cuadrantes2

## Descripción General

Se ha implementado un sistema completo de envío de emails usando **nodemailer** para la plataforma Cuadrantes2. El sistema permite enviar PDFs de consultas de cuadrantes directamente al email del empleado.

## Cambios Realizados

### 1. **Nuevo Módulo de Email**

Ubicación: `apps/api/src/mail/`

#### Archivos Creados:

- **`mail.module.ts`** - Módulo NestJS que exporta el servicio de email
- **`mail.service.ts`** - Servicio principal que gestiona la conexión y envío de emails
- **`interfaces/mail-config.interface.ts`** - Interfaces TypeScript para tipado

#### Características del Servicio:

- ✅ Inicialización automática desde variables de entorno
- ✅ Validación de configuración SMTP
- ✅ Manejo robusto de errores
- ✅ Logging detallado de operaciones
- ✅ Método para verificar conexión SMTP (test)
- ✅ Soporte para adjuntos

### 2. **Dependencias Instaladas**

```bash
npm install nodemailer @types/nodemailer
```

### 3. **Variables de Entorno**

#### Variables Requeridas para Usar Email:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com              # Host del servidor SMTP
SMTP_PORT=587                         # Puerto: 587 (TLS) o 465 (SSL)
SMTP_SECURE=false                     # false para puerto 587 (TLS), true para puerto 465 (SSL)
SMTP_USER=tu-email@gmail.com          # Usuario/email para autenticación SMTP
SMTP_PASSWORD=tu-contraseña-app       # Contraseña o token de aplicación
SMTP_FROM="Cuadrantes <email@empresa.com>"  # Nombre y email del remitente
```

**⚠️ IMPORTANTE - Combinaciones Válidas:**

- **Puerto 587 + `SMTP_SECURE=false`** ← Recomendado (TLS)
- **Puerto 465 + `SMTP_SECURE=true`** ← Alternativa (SSL)

#### En Desarrollo: `.env.development.local`

```dotenv
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email-desarrollo@gmail.com
SMTP_PASSWORD=tu-contraseña-app-desarrollo
SMTP_FROM="Cuadrantes Dev <tu-email@gmail.com>"
```

#### En Producción: `.env.production.local`

```dotenv
# Email Configuration (SMTP)
# Para Gmail o servicios con TLS en puerto 587: SMTP_SECURE=false
# Para servicios con SSL en puerto 465: SMTP_SECURE=true
SMTP_HOST=smtp.tu-proveedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email-produccion@empresa.com
SMTP_PASSWORD=tu-contraseña-app-produccion
SMTP_FROM="Cuadrantes <notificaciones@empresa.com>"
```

### 4. **Actualización del Módulo de Consulta de Cuadrantes**

El módulo `ConsultaCuadrantesModule` ahora importa `MailModule` para usar el servicio de email.

#### Cambios en `consulta-cuadrantes.service.ts`:

1. **Inyección de MailService**:

```typescript
constructor(
  // ... otros repositorios ...
  private readonly mailService: MailService,
) {}
```

2. **Método `generarYEnviarPDF` Mejorado**:
   - Verifica si el servicio de email está configurado
   - Genera el PDF
   - Genera un email HTML profesional con resumen de datos
   - Adjunta el PDF al email
   - Envía usando nodemailer
   - Retorna resultado con éxito o error detallado

3. **Nuevo Método `generarHtmlEmail`**:
   - Genera un HTML profesional con los datos de la consulta
   - Incluye leyenda de estados con colores
   - Formato responsive
   - Estilos CSS inline

## Ejemplos de Uso

### Configuración con Gmail (Desarrollador)

1. **Habilitar "Contraseñas de aplicación"** en tu cuenta Google:
   - Ve a https://myaccount.google.com/security
   - Activa autenticación en dos factores
   - Genera una contraseña de aplicación (selecciona "Mail" y "Windows")
   - Copia la contraseña generada

2. **Configura el `.env.development.local`**:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=xxxxxxxxxxxxxx   # Contraseña de aplicación generada
SMTP_FROM="Cuadrantes Dev <tu-email@gmail.com>"
```

### Configuración con Servidor SMTP Corporativo

```dotenv
SMTP_HOST=mail.empresa.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario@empresa.com
SMTP_PASSWORD=contraseña
SMTP_FROM="Cuadrantes <noreply@empresa.com>"
```

### Configuración con Servicios de Terceros (Sendgrid, Mailgun, etc.)

**Sendgrid**:

```dotenv
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxx
SMTP_FROM="Cuadrantes <noreply@empresa.com>"
```

## Flujo de Envío

```
1. Usuario solicita envío de PDF por email
   ↓
2. API recibe petición en POST /consulta-cuadrantes/enviar-pdf-email
   ↓
3. Servicio verifica si SMTP está configurado
   ├─ Si NO → Retorna error con instrucciones
   └─ Si SÍ → Continúa
   ↓
4. Genera el PDF con los datos del cuadrante
   ↓
5. Obtiene datos del empleado y consulta
   ↓
6. Genera HTML profesional del email
   ↓
7. Adjunta el PDF al email
   ↓
8. Envía a través de nodemailer
   ↓
9. Retorna resultado (éxito o error con detalles)
```

## Respuestas de la API

### Éxito

```json
{
  "success": true,
  "message": "PDF generado y enviado exitosamente a empleado@email.com"
}
```

### Sin Configuración SMTP

```json
{
  "success": false,
  "message": "El servicio de email no está configurado. Configure las variables de entorno: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM"
}
```

### Error al Enviar

```json
{
  "success": false,
  "message": "Error al enviar email: [descripción del error]"
}
```

## Pruebas Locales

### Verificar Conexión SMTP

Puedes crear un endpoint temporal o usarlo en tests:

```typescript
// En un controlador para testing
@Get('test-email-connection')
async testEmailConnection() {
  return await this.mailService.testConnection();
}
```

Llamar a: `GET /test-email-connection`

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Conexión SMTP verificada exitosamente"
}
```

## Logging

El servicio genera logs detallados:

- ℹ️ **INFO**: Inicialización correcta, emails enviados exitosamente
- ⚠️ **WARN**: Configuration missing, non-critical issues
- ❌ **ERROR**: Errores conexión SMTP, fallos en envío

Ejemplo:

```
[MailService] Servicio de email inicializado correctamente: smtp.gmail.com:587
[MailService] Enviando email a: usuarios@empresa.com, asunto: Consulta de Cuadrante
[MailService] Email enviado exitosamente. MessageId: <xxxx@gmail.com>
```

## Frontend (Gestion App)

El frontend ya tiene el botón "Enviar por Email" configurado. Cuando el usuario haga clic:

1. Se envía una petición POST a `/consulta-cuadrantes/enviar-pdf-email`
2. Se muestra un mensaje de éxito o error basado en la respuesta
3. El PDF se genera automáticamente en el servidor y se adjunta

## Resolución de Problemas

### Problema: "Email no configurado: faltan variables de entorno"

**Solución**: Asegúrate de que todas las variables SMTP están definidas en `.env.development.local` o `.env`

### Problema: "Error de autenticación SMTP"

**Solución**:

- Si usas Gmail, verifica que la contraseña es de aplicación, no la contraseña regular
- Verifica que SMTP_USER coincida exactamente con el email
- Revisa los logs del servidor para detalles específicos

### Problema: "ERROR: SSL routines:ssl3_get_record:wrong version number" o similar error SSL

**Este es un error de conflicto entre puerto y configuración SSL/TLS**

**Solución**:

Verifica que tu configuración sea una de estas combinaciones válidas:

**Opción 1: Puerto 587 + TLS (RECOMENDADO para Gmail)**

```env
SMTP_PORT=587
SMTP_SECURE=false    # ← IMPORTANTE: false para TLS
```

**Opción 2: Puerto 465 + SSL**

```env
SMTP_PORT=465
SMTP_SECURE=true     # ← IMPORTANTE: true para SSL
```

**Causas comunes del error:**

- ❌ `SMTP_PORT=587` + `SMTP_SECURE=true` (INCORRECTO)
- ❌ `SMTP_PORT=465` + `SMTP_SECURE=false` (INCORRECTO)
- ✅ `SMTP_PORT=587` + `SMTP_SECURE=false` (CORRECTO)
- ✅ `SMTP_PORT=465` + `SMTP_SECURE=true` (CORRECTO)

### Problema: "Connection timeout"

**Solución**:

- Verifica que SMTP_HOST y SMTP_PORT son correctos
- Comprueba la conectividad de red
- Intenta con la otra combinación puerto/SSL si es necesario

### Problema: "Error: 550 User not found"

**Solución**: El email del empleado en la BD no existe o es inválido. Revisa que el campo `email` del empleado está correctamente configurado.

### Problema: "SMTP no configurado - faltan credenciales"

**Solución**: El servicio verifica que todas estas variables existan. Configúralas en `.env.development.local`:

- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASSWORD
- SMTP_FROM

Si no deseas usar email, simplemente deja estas variables sin definir (el sistema funcionará igual pero sin envío de emails).

## Características Futuras Opcionales

- [ ] Cola de correos (Bull queue) para envíos en segundo plano
- [ ] Plantillas personalizables por departamento
- [ ] Historial de emails enviados
- [ ] Reintentos automáticos en caso de fallo
- [ ] Copias al departamento/gestor
- [ ] Emails programados para envío posterior
- [ ] Soporte para múltiples lenguajes

## Estructura Final del Código

```
apps/api/src/
├── mail/                          (NUEVO)
│   ├── interfaces/
│   │   └── mail-config.interface.ts
│   ├── mail.module.ts
│   └── mail.service.ts
├── oldatabase/
│   └── consulta-cuadrantes/
│       ├── consulta-cuadrantes.module.ts    (ACTUALIZADO - importa MailModule)
│       ├── consulta-cuadrantes.service.ts   (ACTUALIZADO - usa MailService)
│       ├── consulta-cuadrantes.controller.ts
│       └── entities/
```

## Comandos Útiles

```bash
# Instalar dependencias
npm install --workspace=apps/api

# Compilar API
npm run build:api

# Ejecutar API en desarrollo
npm run dev:api

# Ejecutar tests
npm run test:api

# Compilar todo
npm run build
```

---

**Última actualización**: Febrero 2026
**Versión**: 1.0.0
