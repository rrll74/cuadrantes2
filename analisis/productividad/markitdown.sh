#!/bin/bash
if [ -z "$1" ]; then
    echo "Error: Se requiere el nombre del archivo como parámetro"
    echo "Sintaxis: ./markitdown.sh nombrearchivo [extension]"
    echo "Ejemplo: ./markitdown.sh miarchivo pdf"
    echo "         ./markitdown.sh miarchivo docx"
    echo "Por defecto, la extensión es 'pdf' si no se especifica"
    exit 1
fi

# Usar la extensión proporcionada o 'pdf' por defecto
EXTENSION="${2:-pdf}"

docker run --rm -i markitdown:latest < "$1.$EXTENSION" > "$1.md"
