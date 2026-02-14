#!/bin/bash
# test-email-setup.sh - Script para verificar la configuración de email

echo "================================"
echo "Test de Configuración de Email"
echo "================================"
echo ""

# 1. Verificar que nodemailer está instalado
echo "✓ Verificando instalación de nodemailer..."
if npm list nodemailer --workspace=apps/api | grep -q "nodemailer"; then
    echo "  ✅ nodemailer instalado"
else
    echo "  ❌ nodemailer NO instalado"
    exit 1
fi
echo ""

# 2. Verificar que el módulo de email existe
echo "✓ Verificando archivos del módulo de email..."
files=(
    "apps/api/src/mail/mail.service.ts"
    "apps/api/src/mail/mail.module.ts"
    "apps/api/src/mail/interfaces/mail-config.interface.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file NO ENCONTRADO"
        exit 1
    fi
done
echo ""

# 3. Compilar
echo "✓ Compilando API..."
npm run build:api > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ Compilación exitosa"
else
    echo "  ❌ Error en compilación"
    cat /tmp/build.log
    exit 1
fi
echo ""

# 4. Verificar variables de entorno
echo "✓ Verificando variables de entorno requeridas..."
required_vars=("SMTP_HOST" "SMTP_PORT" "SMTP_USER" "SMTP_PASSWORD" "SMTP_FROM")

if [ -f "apps/api/.env.development.local" ]; then
    source apps/api/.env.development.local 2>/dev/null
    
    missing=false
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "  ⚠️  Variable $var no configurada"
            missing=true
        else
            echo "  ✅ $var configurada"
        fi
    done
    
    if [ "$missing" = true ]; then
        echo ""
        echo "❌ Faltan variables de entorno. Configúralas en apps/api/.env.development.local"
        exit 1
    fi
else
    echo "  ⚠️  .env.development.local no encontrado. Uso valores de ejemplo."
fi
echo ""

echo "================================"
echo "✅ Configuración verificada correctamente"
echo "================================"
echo ""
echo "Próximos pasos:"
echo "1. npm run dev:api"
echo "2. Acceder a http://localhost:3101/consulta-cuadrantes"
echo "3. Probar: Seleccionar empleado → Enviar por Email"
echo ""
