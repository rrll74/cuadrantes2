#!/bin/bash
# Script para configurar Todo Tree automáticamente en Linux/Mac/Windows
# Ejecutar: bash .vscode/setup-ripgrep.sh

RG_PATH=$(which rg)

if [ -z "$RG_PATH" ]; then
  echo "❌ ripgrep no encontrado. Instálalo con:"
  echo "   sudo apt install -y ripgrep  # Ubuntu/Debian"
  echo "   brew install ripgrep         # macOS"
  exit 1
fi

echo "✅ ripgrep encontrado en: $RG_PATH"

# Generar settings.json automáticamente según el SO
SETTINGS_FILE=".vscode/settings.json"

# Usar "rg" desde PATH (funciona en todos los SO después de instalar ripgrep)
cat > "$SETTINGS_FILE" << 'EOF'
{
  "prettier.endOfLine": "auto",
  "todo-tree.ripgrep.ripgrep": "rg"
}
EOF

echo "✅ Configuración guardada en: $SETTINGS_FILE"
echo "✅ Todo Tree está listo. Reinicia VS Code."

