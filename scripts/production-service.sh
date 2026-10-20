#!/bin/bash

# Detiene la ejecución si cualquier comando falla
set -e

# Detecta el comando de docker-compose correcto según la versión de Ubuntu
detect_docker_compose() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        if [[ "$VERSION_ID" == "26.04" && "$ID" == "ubuntu" ]]; then
            echo "docker compose"
        else
            echo "docker-compose"
        fi
    else
        # Fallback a docker-compose si no se puede determinar la versión
        echo "docker-compose"
    fi
}

DOCKER_COMPOSE_CMD=$(detect_docker_compose)

# El primer argumento pasado al script ($1) determina la acción
ACTION=$1

# Definimos las rutas a los ficheros docker-compose para claridad
START_PRODUCTION_COMPOSE_FILE="./docker-compose.prod.yml"

# Función para mostrar cómo usar el script
usage() {
  echo "Uso: $0 [up|down]"
  echo "  up:   Levanta los contenedores de Docker en segundo plano para la API y la gestión."
  echo "  down: Detiene y elimina los contenedores de Docker para la API y la gestión."
  exit 1
}

# --- Comprobaciones Previas ---
if [ ! -f "$START_PRODUCTION_COMPOSE_FILE" ]; then
    echo "Error: No se encontraron los archivos docker-compose.yaml requeridos."
    echo "Asegúrate de que las rutas en el script son correctas:"
    echo "  - $START_PRODUCTION_COMPOSE_FILE"
    exit 1
fi

# Comprobamos la acción solicitada
case "$ACTION" in
  up)
    echo "--- Levantando contenedores base (API y Gestion)... ---"
    $DOCKER_COMPOSE_CMD -f "$START_PRODUCTION_COMPOSE_FILE" up -d
    echo "--- Contenedores levantados. ---"
    ;;
  down)
    echo "--- Deteniendo contenedores base (API y Gestion)... ---"
    $DOCKER_COMPOSE_CMD -f "$START_PRODUCTION_COMPOSE_FILE" down
    echo "--- Contenedores detenidos. ---"
    ;;
  *)
    # Si el argumento no es 'up' ni 'down', o no se proporciona, muestra el uso correcto
    usage
    ;;
esac