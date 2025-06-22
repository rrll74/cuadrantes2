# ---- Etapa 1: Builder ----
# Usa la imagen completa de Node para instalar dependencias y construir la aplicación
# FROM node:iron-alpine3.22 AS builder
FROM node:iron-alpine3.22

WORKDIR /usr/src/app

# Copia el código fuente de la aplicación con las restricciones del .dockerignore
COPY . .

# Copia los ficheros de dependencias y las instala
# Esto aprovecha el cache de Docker para no reinstalar si no cambian
# COPY package*.json ./
RUN npm install

# Construye la aplicación para producción
RUN npm run build

# ---- Etapa 2: Production ----
# Usa una imagen base de Node más ligera para la ejecución
# FROM node:iron-alpine3.22

# WORKDIR /usr/src/app

# Copia solo las dependencias de producción desde la etapa de builder
# COPY --from=builder /usr/src/app/node_modules ./node_modules
# Copia la aplicación compilada desde la etapa de builder
# COPY --from=builder /usr/src/app/dist ./dist
# Copia el fichero de entorno de producción
# COPY ./.env.production .
# COPY ./.env .
# Expone el puerto en el que la API va a correr
EXPOSE 3101

# El comando para iniciar la aplicación en producción
ENTRYPOINT [ "npm", "run", "start:prod" ]