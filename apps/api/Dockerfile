# --- Fase 1: Build ---
# Usamos una imagen de Node.js más completa para instalar dependencias y construir el proyecto.
FROM node:20-alpine AS builder

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiamos primero todo el código fuente del monorepo.
COPY . .

# Instalamos TODAS las dependencias necesarias para el build.
RUN npm install

# Construimos la aplicación de la API desde la raíz del monorepo.
# Esto asegura que se use la configuración correcta y se genere el output esperado.
RUN npm run build:api

# --- Fase 2: Producción ---
# Usamos una imagen de Node.js ligera para la ejecución.
FROM node:20-alpine

ENV NODE_ENV=production
# El directorio de trabajo final será la raíz de la app
WORKDIR /usr/src/app 

# Copiamos los package.json necesarios para instalar solo las dependencias de producción.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-dto/package.json ./packages/shared-dto/

# Instalamos ÚNICAMENTE las dependencias de producción.
RUN npm install --omit=dev

# Copiamos los artefactos de build desde la fase 'builder'.
# La ruta de origen en 'builder' es la que genera el build del monorepo.
# Corregido: Apuntamos a la ruta de salida real observada.
COPY --from=builder /usr/src/app/apps/api/dist .

# Ejecuta la aplicación directamente con Node. Es más simple y evita problemas de directorios.
# Corregido: Apuntamos a la ruta real del fichero de arranque, que está dentro de 'src'.
CMD ["node", "src/main.js"]