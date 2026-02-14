# Guía Rápida de Configuración - Email

## Paso 1: Variables de Entorno

Copia una de estas configuraciones según tu proveedor:

### Opción 1: Gmail (Recomendado para Desarrollo)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-correo@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_FROM="Cuadrantes <tu-correo@gmail.com>"
```

⚠️ **Importante**: Debes generar una "Contraseña de aplicación" en tu cuenta Google (no use contraseña regular)

### Opción 2: Servidor Corporativo

```env
SMTP_HOST=mail.tu-empresa.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario@empresa.com
SMTP_PASSWORD=contraseña
SMTP_FROM="Cuadrantes <no-reply@empresa.com>"
```

### Opción 3: Sendgrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxx
SMTP_FROM="Cuadrantes <noreply@empresa.com>"
```

## Paso 2: Agregar al Archivo .env

En **desarrollo**: Editar `apps/api/.env.development.local`
En **producción**: Editar `apps/api/.env.production.local`

## Paso 3: Iniciar Servidor

```bash
npm run dev:api
```

## Paso 4: Verificar Funcionamiento

### Test en Postman/cURL:

```bash
curl -X GET http://localhost:3101/consulta-cuadrantes/test-email-connection
```

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Conexión SMTP verificada exitosamente"
}
```

### Test en App:

1. Ir a "Consulta de Cuadrantes"
2. Seleccionar empleado, período y cuadrante
3. Hacer clic en "Enviar por Email"
4. Verificar que el email llega a la bandeja del destinatario

## Troubleshooting

| Problema                       | Solución                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| "Email no configurado"         | Verifica que todas las variables SMTP están en `.env`                               |
| "Error de autenticación"       | Revisa credenciales y que es contraseña de app (Gmail)                              |
| **"SSL wrong version number"** | **Cambia `SMTP_SECURE=false` para puerto 587 o `SMTP_SECURE=true` para puerto 465** |
| "Connection timeout"           | Prueba con `SMTP_SECURE=true` y `SMTP_PORT=465` si tienes timeout                   |
| "Email no recibido"            | Verifica que el email del empleado en BD es válido                                  |

## Combinaciones Correctas de Puerto y SSL

| Puerto  | SMTP_SECURE | Protocolo      | Ejemplo                           |
| ------- | ----------- | -------------- | --------------------------------- |
| **587** | **false**   | TLS (STARTTLS) | ✅ Gmail, servidores corporativos |
| **465** | **true**    | SSL/SMTPS      | ✅ Alternativa segura             |
| 25      | false       | Plain/TLS      | Servidor local                    |

**❌ INCORRECTO:**

- Puerto 587 + `SMTP_SECURE=true` → Error SSL
- Puerto 465 + `SMTP_SECURE=false` → Error SSL

## Archivos Creados/Modificados

✅ **Creados:**

- `apps/api/src/mail/mail.service.ts` - Servicio de emails
- `apps/api/src/mail/mail.module.ts` - Módulo NestJS
- `apps/api/src/mail/interfaces/mail-config.interface.ts` - Tipos

✅ **Modificados:**

- `apps/api/src/oldatabase/consulta-cuadrantes/consulta-cuadrantes.module.ts` - Importa MailModule
- `apps/api/src/oldatabase/consulta-cuadrantes/consulta-cuadrantes.service.ts` - Inyecta MailService, implementa envío
- `apps/api/package.json` - Agrega nodemailer

✅ **Configuración:**

- `apps/api/example.env.development.local` - Agregadas variables SMTP
- `apps/api/example.env.production.local` - Creado con variables SMTP

---

📖 Ver documentación completa: [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md)
