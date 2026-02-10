# --- Fase 1: Dependencias ---
FROM node:20-alpine AS deps

WORKDIR /app

# Copiamos los package.json y package-lock.json del monorepo
COPY package*.json ./
COPY packages/shared-dto/package.json ./packages/shared-dto/
COPY apps/gestion/package.json ./apps/gestion/

# Instalamos TODAS las dependencias (incluidas las de desarrollo)
# Usamos 'npm ci' para reproducibilidad exacta (recomendado en Docker)
RUN npm ci

# --- Fase 2: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copiamos las dependencias de la fase anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copia el fichero de entorno de producción específico para la compilación del frontend
# Next.js lo usará automáticamente durante el `npm run build:gestion`
COPY apps/gestion/.env.production.local ./apps/gestion/.env.production.local

# Construimos la librería compartida
RUN npm run build --workspace=@cuadrantes/shared-dto

# Construimos la aplicación de gestión
RUN npm run build:gestion

# --- Fase 3: Producción ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copiamos la salida "standalone" de Next.js
COPY --from=builder /app/apps/gestion/.next/standalone ./
COPY --from=builder /app/apps/gestion/.next/static ./apps/gestion/.next/static
COPY --from=builder /app/apps/gestion/public ./apps/gestion/public
COPY --from=builder /app/packages/shared-dto/dist ./packages/shared-dto/dist


CMD ["node", "apps/gestion/server.js"]