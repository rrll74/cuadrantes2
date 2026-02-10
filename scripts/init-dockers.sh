#!/bin/bash

# Detiene la ejecución si cualquier comando falla
set -e

# El primer argumento pasado al script ($1) determina la acción
ACTION=$1

# Definimos las rutas a los ficheros docker-compose para claridad
PRODUCTION_MODE=$2
if [ "$PRODUCTION_MODE" == "--prod" ]; then
    echo "Modo de producción activado. Usando archivos docker-compose.prod.yaml."
    PHP_COMPOSE_FILE="../../phpcuadrantes/docker-compose.prod.yaml"
    MARIADB_COMPOSE_FILE="./docker-compose-mariadb.prod.yaml"
else
    echo "Modo de desarrollo activado. Usando archivos docker-compose.yaml."
    PHP_COMPOSE_FILE="../../phpcuadrantes/docker-compose.yaml"
    MARIADB_COMPOSE_FILE="./docker-compose-mariadb.yaml"
fi

# Función para mostrar cómo usar el script
usage() {
  echo "Uso: $0 [up|down] [--prod]"
  echo "  up:   Levanta los contenedores de Docker en segundo plano."
  echo "  down: Detiene y elimina los contenedores de Docker."
  echo "  --prod: Usa los archivos de configuración para producción."
  exit 1
}

# --- Comprobaciones Previas ---
if [ ! -f "$PHP_COMPOSE_FILE" ] || [ ! -f "$MARIADB_COMPOSE_FILE" ]; then
    echo "Error: No se encontraron los archivos docker-compose.yaml requeridos."
    echo "Asegúrate de que las rutas en el script son correctas:"
    echo "  - $PHP_COMPOSE_FILE"
    echo "  - $MARIADB_COMPOSE_FILE"
    exit 1
fi

# Comprobamos la acción solicitada
case "$ACTION" in
  up)
    echo "--- Levantando contenedores base (Estructura antigua y MariaDB para app nueva)... ---"
    docker-compose -f "$PHP_COMPOSE_FILE" up -d
    docker-compose -f "$MARIADB_COMPOSE_FILE" up -d
    echo "--- Contenedores levantados. ---"
    ;;
  down)
    echo "--- Deteniendo contenedores base (Estructura antigua y MariaDB para app nueva)... ---"
    docker-compose -f "$PHP_COMPOSE_FILE" down
    docker-compose -f "$MARIADB_COMPOSE_FILE" down
    echo "--- Contenedores detenidos. ---"
    ;;
  *)
    # Si el argumento no es 'up' ni 'down', o no se proporciona, muestra el uso correcto
    usage
    ;;
esac