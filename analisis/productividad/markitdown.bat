@echo off
if "%1"==" " (
    echo Error: Se requiere el nombre del archivo como parámetro
    echo Sintaxis: markitdown.bat nombrearchivo [extension]
    echo Ejemplo: markitdown.bat miarchivo pdf
    echo.         markitdown.bat miarchivo docx
    echo Por defecto, la extension es 'pdf' si no se especifica
    exit /b 1
)

if "%2"==" " (
    set EXTENSION=pdf
) else (
    set EXTENSION=%2
)

docker run --rm -i markitdown:latest < %1.%EXTENSION% > %1.md