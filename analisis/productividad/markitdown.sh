#!/bin/bash
if [ -z "$1" ]; then
    echo "Error: Se requiere el nombre del archivo sin la extensión pdf como parámetro"
    echo "Sintaxis: ./markitdown.sh nombrearchivo"
    echo "Ejemplo: ./markitdown.sh miarchivo"
    exit 1
fi
docker run --rm -i markitdown:latest < "$1.pdf" > "$1.md"
