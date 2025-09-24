#!/bin/bash
# /home/administrador/phpcuadrantes/docker-compose up -d
/home/administrador/cuadrantes2/scripts/init-dockers.sh
/home/administrador/cuadrantes2/scripts/production-service.sh up

echo "El servidor se ha iniciado con éxito!" >> /var/log/init_log.log