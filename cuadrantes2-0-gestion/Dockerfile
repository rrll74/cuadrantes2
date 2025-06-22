# ---- Etapa 1: Builder ----
FROM node:iron-alpine3.22

WORKDIR /app

COPY . .

RUN npm install


# Construye la aplicación Next.js para producción
RUN npm run build

ENV PORT 3102

# Expone el puerto en el que la App va a correr
EXPOSE 3102

# Comando para iniciar el servidor de Next.js optimizado
CMD ["npm", "start"]