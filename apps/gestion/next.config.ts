import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // output: "standalone",
  experimental: {
    // Esta es la clave para que Turbopack funcione en un monorepo.
    // Permite que Next.js resuelva y compile paquetes fuera de su
    // directorio raíz, como los que están en la raíz del monorepo.
    externalDir: true,
  },
  allowedDevOrigins: ["http://192.168.0.23:3002"],
};

export default nextConfig;
