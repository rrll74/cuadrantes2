import axios from "axios";

// Determina la URL base correcta dependiendo del entorno de ejecución.
// - `typeof window === 'undefined'` es VERDADERO en el servidor (SSR, Server Actions).
// - Es FALSO en el navegador del cliente.
const baseURL =
  typeof window === "undefined"
    ? process.env.API_URL_SERVER_SIDE // URL para comunicación interna de Docker
    : process.env.NEXT_PUBLIC_API_URL; // URL pública para el navegador

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

export default api;
