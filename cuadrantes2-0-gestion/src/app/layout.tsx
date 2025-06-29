import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Gestión de Personal",
  description: "Aplicación de gestión para Servicios Operativos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ThemeRegistry>
            <Providers>{children}</Providers>
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
}
