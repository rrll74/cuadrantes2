#!/bin/bash
# Script para configurar Todo Tree en Linux/Mac
# Ejecutar: bash .vscode/setup-ripgrep.sh

RG_PATH=$(which rg)

if [ -z "$RG_PATH" ]; then
  echo "❌ ripgrep no encontrado. Instálalo con:"
  echo "   sudo apt install -y ripgrep  # Ubuntu/Debian"
  echo "   brew install ripgrep          # macOS"
  exit 1
fi

echo "✅ ripgrep encontrado en: $RG_PATH"
echo "Configuración para Linux ya lista (usa rg desde PATH)"
