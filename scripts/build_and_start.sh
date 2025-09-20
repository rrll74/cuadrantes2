#!/bin/bash

# Detiene la ejecución si cualquier comando falla
set -e

echo "--- Deteniendo y eliminando contenedores antiguos... ---"
docker-compose -f docker-compose.prod.yml down

echo "--- Construyendo imagen de la API... ---"
docker build -t cuadrantes-api:1.0.0 -f ../apps/api/Dockerfile .

echo "--- Construyendo imagen de la App de Gestión... ---"
docker build -t cuadrantes-gestion:1.0.0 -f ../apps/gestion/Dockerfile .

echo "--- Levantando nuevos contenedores en segundo plano... ---"
docker-compose -f docker-compose.prod.yml up -d

echo "--- Limpiando imágenes de Docker no utilizadas... ---"
docker image prune -f

echo "--- ¡Despliegue completado! ---"