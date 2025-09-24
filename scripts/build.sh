#!/bin/bash

# Detiene la ejecución si cualquier comando falla
set -e

# --- Configuración ---
API_IMAGE_NAME="cuadrantes-api"
GESTION_IMAGE_NAME="cuadrantes-gestion"
TAG="1.0.0"

API_DEPS_IMAGE="${API_IMAGE_NAME}:${TAG}-deps"
GESTION_DEPS_IMAGE="${GESTION_IMAGE_NAME}:${TAG}-deps"

API_FINAL_IMAGE="${API_IMAGE_NAME}:${TAG}"
GESTION_FINAL_IMAGE="${GESTION_IMAGE_NAME}:${TAG}"

API_DOCKERFILE="../apps/api/Dockerfile"
GESTION_DOCKERFILE="../apps/gestion/Dockerfile"

# --- Argumentos de la línea de comandos ---
BUILD_DEPS_ONLY=false
BUILD_FINAL=false
START_SERVICES=false

for arg in "$@"; do
  case $arg in
    --final-build)
      BUILD_FINAL=true
      shift # Quita --final-build de los argumentos
      ;;
    --deps-only)
      BUILD_DEPS_ONLY=true
      shift # Quita --deps-only de los argumentos
      ;;
    --start)
      START_SERVICES=true
      shift # Quita --start de los argumentos
      ;;
    *)
      # Ignora otros argumentos por ahora
      ;;
  esac
done

# --- Funciones ---

usage() {
  echo "Uso: $0 <acción> [--start]"
  echo "Es necesario especificar una acción de construcción."
  echo ""
  echo "Acciones (obligatorias):"
  echo "  --deps-only:      Construye únicamente las imágenes base con las dependencias (node_modules)."
  echo "  --final-build:    Construye las imágenes finales de la aplicación usando la caché de dependencias."
  echo ""
  echo "Opciones adicionales:"
  echo "  --start:          (Opcional, con --final-build) Levanta los servicios después de construir las imágenes."
  exit 1
}

build_deps_images() {
  echo "--- Construyendo imagen de dependencias para la API... ---"
  docker build -t "$API_DEPS_IMAGE" --target deps -f "$API_DOCKERFILE" ../.

  echo "--- Construyendo imagen de dependencias para la App de Gestión... ---"
  docker build -t "$GESTION_DEPS_IMAGE" --target deps -f "$GESTION_DOCKERFILE" ../.

  echo "--- Imágenes de dependencias construidas con éxito. ---"
  echo "Imágenes creadas:"
  echo "  - $API_DEPS_IMAGE"
  echo "  - $GESTION_DEPS_IMAGE"
}

build_final_images() {
  echo "--- Deteniendo servicios existentes antes de la construcción... ---"
  ./production-service.sh down

  echo "--- Construyendo imagen final de la API... ---"
  # Usamos --cache-from para indicarle a Docker que puede usar la imagen de dependencias como caché
  docker build --cache-from "$API_DEPS_IMAGE" -t "$API_FINAL_IMAGE" -f "$API_DOCKERFILE" ../.

  echo "--- Construyendo imagen final de la App de Gestión... ---"
  docker build --cache-from "$GESTION_DEPS_IMAGE" -t "$GESTION_FINAL_IMAGE" -f "$GESTION_DOCKERFILE" ../.

  echo "--- Imágenes finales construidas con éxito. ---"
  echo "Imágenes creadas:"
  echo "  - $API_FINAL_IMAGE"
  echo "  - $GESTION_FINAL_IMAGE"

  echo "--- Limpiando imágenes de Docker no utilizadas... ---"
  docker image prune -f
}

# --- Lógica Principal ---

# Si no se ha especificado ninguna acción de build, muestra el uso y sal.
if [ "$BUILD_DEPS_ONLY" = false ] && [ "$BUILD_FINAL" = false ]; then
  usage
fi

# Si se especifican ambas acciones, es un error.
if [ "$BUILD_DEPS_ONLY" = true ] && [ "$BUILD_FINAL" = true ]; then
  echo "Error: Los argumentos --deps-only y --final-build son mutuamente excluyentes."
  usage
fi

if [ "$BUILD_DEPS_ONLY" = true ]; then
  build_deps_images
elif [ "$BUILD_FINAL" = true ]; then
  build_final_images
  if [ "$START_SERVICES" = true ]; then
    echo "--- Levantando servicios de producción... ---"
    ./production-service.sh up
    echo "--- ¡Despliegue completado y servicios iniciados! ---"
  else
    echo "--- ¡Construcción completada! ---"
    echo "Ejecuta './production-service.sh up' para iniciar los servicios."
  fi
fi

exit 0
