#!/bin/bash

# Detiene la ejecución si cualquier comando falla
set -e

# El primer argumento pasado al script ($1) determina la acción
ACTION=$1

# Definimos las rutas a los ficheros docker-compose para claridad
PHP_COMPOSE_FILE="../../phpcuadrantes/docker-compose.yaml"
MARIADB_COMPOSE_FILE="./docker-compose-mariadb.yaml"

# Función para mostrar cómo usar el script
usage() {
  echo "Uso: $0 [up|down]"
  echo "  up:   Levanta los contenedores de Docker en segundo plano."
  echo "  down: Detiene y elimina los contenedores de Docker."
  exit 1
}

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