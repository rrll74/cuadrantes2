# --- Fase 1: Dependencias ---
FROM node:20-alpine AS deps

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los package.json necesarios para instalar las dependencias del monorepo
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-dto/package.json ./packages/shared-dto/

# Instalamos TODAS las dependencias (incluidas las de desarrollo para el build)
RUN npm install

# --- Fase 2: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copiamos las dependencias de la fase anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiamos el resto del código fuente
COPY . .

# Construimos la librería compartida
RUN npm run build --workspace=@cuadrantes/shared-dto

# Construimos la aplicación de la API
RUN npm run build:api

# --- Fase 2: Producción ---
# Usamos una imagen de Node.js ligera para la ejecución.
FROM node:20-alpine AS runner

ENV NODE_ENV=production
# El directorio de trabajo final será la raíz de la app
WORKDIR /app

# Copiamos los package.json necesarios para instalar solo las dependencias de producción.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-dto/package.json ./packages/shared-dto/

# Instalamos ÚNICAMENTE las dependencias de producción.
RUN npm install --omit=dev

# Copiamos los artefactos de build desde la fase 'builder'.
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/packages/shared-dto/dist ./packages/shared-dto/dist

# Ejecuta la aplicación directamente con Node. Es más simple y evita problemas de directorios.
CMD ["node", "dist/src/main.js"]