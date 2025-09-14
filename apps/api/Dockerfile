# --- Fase 1: Build ---
# Usamos una imagen de Node.js más completa para instalar dependencias y construir el proyecto.
FROM node:20-alpine AS builder

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiamos los package.json y package-lock.json del monorepo
# para instalar todas las dependencias necesarias para el build.
COPY package*.json ./
COPY packages/shared-dto/package.json ./packages/shared-dto/
COPY apps/api/package.json ./apps/api/

# Instalamos TODAS las dependencias (incluidas las de desarrollo)
RUN npm install

# Copiamos el resto del código fuente
COPY . .

# Construimos la aplicación de la API
RUN npm run build:api

# --- Fase 2: Producción ---
# Usamos una imagen de Node.js ligera para la ejecución.
FROM node:20-alpine

WORKDIR /usr/src/app

# Copiamos solo los artefactos de build y las dependencias de producción desde la fase 'builder'
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY apps/api/package.json ./

# El comando para iniciar la aplicación en modo producción
CMD ["npm", "run", "start:prod"]