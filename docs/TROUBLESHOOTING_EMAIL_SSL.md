# Troubleshooting - Error SSL al Enviar Emails

## ❌ Error: "SSL routines:ssl3_get_record:wrong version number"

Este error indica un **conflicto entre el tipo de conexión SSL/TLS y el puerto SMTP**.

## 🔍 Diagnóstico Rápido

### Ejecuta el diagnóstico automático:

```bash
cd /home/ramon/code/cuadrantes2
./diagnostic-smtp.sh
```

Este script verifica:

- ✅ Variables de entorno configuradas
- ✅ Combinación puerto/SMTP_SECURE correcta
- ✅ Conectividad de red a servidor SMTP

### Prueba directa con nodemailer:

```bash
cd /home/ramon/code/cuadrantes2
npx ts-node test-smtp-direct.ts
```

## ✅ Soluciones Probadas

### 1. **Verificar Combinación Puerto + SMTP_SECURE**

El error ocurre cuando hay **incompatibilidad**:

| Puerto | SMTP_SECURE | Resultado                  |
| ------ | ----------- | -------------------------- |
| 587    | `false`     | ✅ CORRECTO (TLS/STARTTLS) |
| 587    | `true`      | ❌ ERROR SSL               |
| 465    | `true`      | ✅ CORRECTO (SSL/SMTPS)    |
| 465    | `false`     | ❌ ERROR SSL               |

**Tu configuración actual:**

```env
SMTP_PORT=587
SMTP_SECURE=false  # ← Debe ser false para puerto 587
```

### 2. **Contraseña de Gmail**

Gmail requiere **"Contraseña de Aplicación"**, NO la contraseña regular.

**Generar contraseña de aplicación:**

1. Ve a https://myaccount.google.com/apppasswords
2. Selecciona "Mail" → "Windows Computer" (o cualquier nombre)
3. Copia la contraseña de 16 caracteres (ej: `xxxx xxxx xxxx xxxx`)
4. Actualiza tu `.env.development.local`:

```env
SMTP_PASSWORD=xxxxxxxxxxxxxxxx  # Sin espacios
```

⚠️ **Importante:**

- Si la contraseña tiene **espacios**, elimínalos
- Si copiaste con espacios, pega y limpia
- La contraseña debe ser 16 caracteres sin espacios

### 3. **Configuración Mejorada en MailService**

He actualizado el servicio con:

- ✅ Trimming automático de credenciales (elimina espacios)
- ✅ Configuración TLS explícita para puerto 587
- ✅ `requireTLS: true` para STARTTLS
- ✅ `minVersion: 'TLSv1.2'` para compatibilidad
- ✅ Logging mejorado
- ✅ Manejo robusto de errores

### 4. **Alternativa: Usar Puerto 465 con SSL**

Si el puerto 587 sigue fallando, prueba SSL en puerto 465:

```env
# En .env.development.local
SMTP_PORT=465
SMTP_SECURE=true
SMTP_HOST=smtp.gmail.com
SMTP_USER=seroperativos@gmail.com
SMTP_PASSWORD=tu-contraseña-de-app
SMTP_FROM="Cuadrantes <seroperativos@gmail.com>"
```

## 🛠️ Pasos para Resolver

### Paso 1: Verifica tu `.env.development.local`

```bash
cat apps/api/.env.development.local | grep SMTP
```

Debe mostrar:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seroperativos@gmail.com
SMTP_PASSWORD=xxxxxxxxxxxxxxxx  # 16 caracteres sin espacios
SMTP_FROM="Cuadrantes <seroperativos@gmail.com>"
```

### Paso 2: Ejecuta diagnóstico

```bash
./diagnostic-smtp.sh
```

Si ves ❌ en alguna validación, corrígela.

### Paso 3: Reinicia el servidor API

```bash
npm run dev:api
```

Busca en los logs:

```
[MailService] ✅ Servicio de email inicializado: smtp.gmail.com:587 (usuario: ..., secure: false)
[MailService] Usando TLS/STARTTLS (puerto 587)
```

### Paso 4: Prueba envío

1. Ve a "Consulta de Cuadrantes"
2. Selecciona empleado, período, cuadrante
3. Clic en "Enviar por Email"
4. Revisa logs del servidor

## 🐛 Si Aún No Funciona

### Opción A: Prueba directa

```bash
cd /home/ramon/code/cuadrantes2
export $(cat apps/api/.env.development.local | grep SMTP | xargs)
npx ts-node test-smtp-direct.ts
```

Esto te dará el error exacto de nodemailer.

### Opción B: Verifica autenticación Gmail

1. Ve a https://myaccount.google.com/security
2. Verifica que "Verificación en 2 pasos" está **Activada**
3. Si no está activada, actívala
4. Genera nueva "Contraseña de aplicación"
5. Actualiza `.env.development.local`

### Opción C: Check firewall/proxy

Si estás tras un proxy corporativo:

```bash
nc -zv smtp.gmail.com 587
```

Si no conecta, tu red bloquea el puerto 587.

**Soluciones:**

- Configura proxy en `.env` si aplica
- Usa VPN
- Prueba desde otra red (ej: hotspot móvil)

### Opción D: Logs detallados

Edita `mail.service.ts` temporalmente:

```typescript
// En initializeTransporter(), cambia:
logger: true,
debug: true,  // ← Cambiar a true
```

Reinicia y revisa logs completos de nodemailer.

## 📊 Tabla de Referencia Rápida

| Error                   | Causa                       | Solución                             |
| ----------------------- | --------------------------- | ------------------------------------ |
| "wrong version number"  | Puerto/SECURE incompatibles | Puerto 587 → SECURE=false            |
| "authentication failed" | Contraseña incorrecta       | Usar contraseña de aplicación Gmail  |
| "ETIMEDOUT"             | Red/Firewall bloqueando     | Verificar conectividad, proxy        |
| "ECONNREFUSED"          | Puerto incorrecto           | Verificar SMTP_PORT=587              |
| Espacios en contraseña  | Contraseña mal copiada      | Eliminar espacios, pegar sin formato |

## 🎯 Resumen de Archivos Modificados

```
✅ apps/api/src/mail/mail.service.ts
   - Configuración TLS mejorada
   - requireTLS para puerto 587
   - Trimming de credenciales
   - Logging detallado

✅ apps/api/.env.development.local
   - SMTP_PORT=587
   - SMTP_SECURE=false
   - Contraseña actualizada

✅ Scripts de diagnóstico
   - diagnostic-smtp.sh → Validación automática
   - test-smtp-direct.ts → Prueba directa nodemailer
```

## 📞 Si Nada Funciona

1. **Comparte logs completos** del servidor cuando intentas enviar
2. **Ejecuta `./diagnostic-smtp.sh`** y comparte output
3. **Ejecuta `npx ts-node test-smtp-direct.ts`** y comparte resultado
4. Verifica que tu cuenta Gmail no tiene restricciones de seguridad activas

---

**Última actualización:** Febrero 2026  
**Autor:** Sistema Cuadrantes2
