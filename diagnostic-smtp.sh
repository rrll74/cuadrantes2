#!/bin/bash
# diagnostic-smtp.sh - Diagnóstico detallado de configuración SMTP

echo "================================"
echo "Diagnóstico SMTP - cuadrantes2"
echo "================================"
echo ""

# Cargar .env
if [ -f "apps/api/.env.development.local" ]; then
    source apps/api/.env.development.local
    echo "✅ Archivo .env.development.local cargado"
else
    echo "❌ No se encontró .env.development.local"
    exit 1
fi

echo ""
echo "📋 Configuración SMTP Actual:"
echo "-----------------------------------"
echo "SMTP_HOST: $SMTP_HOST"
echo "SMTP_PORT: $SMTP_PORT"
echo "SMTP_SECURE: $SMTP_SECURE"
echo "SMTP_USER: $SMTP_USER"
echo "SMTP_PASSWORD: $(echo $SMTP_PASSWORD | cut -c1-3)...$(echo $SMTP_PASSWORD | rev | cut -c1-3 | rev)"
echo "SMTP_FROM: $SMTP_FROM"
echo ""

# Verificar validez de configuración
echo "✓ Validación de Configuración:"
echo "-----------------------------------"

# Validar que no haya espacios en la contraseña
if [[ "$SMTP_PASSWORD" =~ [[:space:]] ]]; then
    echo "⚠️  ADVERTENCIA: SMTP_PASSWORD contiene espacios"
    echo "   Esto es común en contraseñas de aplicación de Gmail"
    echo "   Si hay espacios, elimínalos o coloca entre comillas"
fi

# Validar combinación puerto/secure
if [ "$SMTP_PORT" == "587" ] && [ "$SMTP_SECURE" == "true" ]; then
    echo "❌ ERROR: Puerto 587 requiere SMTP_SECURE=false (TLS)"
    echo "   Cambia SMTP_SECURE=false"
    exit 1
elif [ "$SMTP_PORT" == "465" ] && [ "$SMTP_SECURE" == "false" ]; then
    echo "❌ ERROR: Puerto 465 requiere SMTP_SECURE=true (SSL)"
    echo "   Cambia SMTP_SECURE=true"
    exit 1
else
    echo "✅ Combinación puerto/SECURE válida (Puerto $SMTP_PORT, Secure: $SMTP_SECURE)"
fi

# Verificar conectividad de red
echo ""
echo "🔗 Prueba de Conectividad:"
echo "-----------------------------------"

# Prueba NC (netcat)
if command -v nc &> /dev/null; then
    if nc -zv -w 3 "$SMTP_HOST" "$SMTP_PORT" 2>&1 | grep -q "succeeded\|open"; then
        echo "✅ Conexión de red a $SMTP_HOST:$SMTP_PORT - ABIERTO"
    else
        echo "⚠️  Conexión a $SMTP_HOST:$SMTP_PORT podría estar bloqueada"
        echo "   Esto podría ser firewall, proxy o ISP"
    fi
else
    echo "⚠️  netcat no disponible, saltando prueba de conectividad"
fi

echo ""
echo "📝 Próximos Pasos:"
echo "-----------------------------------"
echo "1. Verifica que la configuración anterior es correcta"
echo "2. Ejecuta: npm run dev:api"
echo "3. Cuando veas el log 'Servicio de email inicializado'"
echo "4. Intenta enviar un email"
echo "5. Revisa los logs para ERRORES específicos"
echo ""
echo "En caso de error SSL, revisa:"
echo "   • SMTP_PORT y SMTP_SECURE deben coincidir"
echo "   • Puerto 587 + SECURE=false (TLS/STARTTLS)"
echo "   • Puerto 465 + SECURE=true (SSL)"
echo ""
