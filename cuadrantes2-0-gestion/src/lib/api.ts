import axios from "axios";

const apiHost = process.env.NEXT_PUBLIC_API_HOST;
const apiPort = process.env.NEXT_PUBLIC_API_PORT;

console.log(apiHost, apiPort);

const api = axios.create({
  baseURL: `http://${apiHost}:${apiPort}`, // La URL de tu backend NestJS
  withCredentials: true,
});

export default api;
