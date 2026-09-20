@echo off
if "%1"==" " (
    echo Error: Se requiere el nombre del archivo sin la extensión pdf como parámetro
    echo Sintaxis: markitdown.bat nombrearchivo
    echo Ejemplo: markitdown.bat miarchivo
    exit /b 1
)
docker run --rm -i markitdown:latest < %1.pdf > %1.md