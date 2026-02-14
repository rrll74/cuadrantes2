/* eslint-disable */
/**
 * Script directo de prueba SMTP con nodemailer
 * Ejecutar con: npx ts-node -r tsconfig-paths/register test-smtp-direct.ts
 */

import * as nodemailer from "nodemailer";

async function testSMTP() {
  console.log("🔍 Prueba Directa de Conexión SMTP con Nodemailer\n");

  // Configuración
  const smtpConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true" ? true : false,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASSWORD || "",
    },
  };

  console.log("📋 Configuración:");
  console.log(`  Host: ${smtpConfig.host}`);
  console.log(`  Port: ${smtpConfig.port}`);
  console.log(`  Secure: ${smtpConfig.secure}`);
  console.log(`  User: ${smtpConfig.auth.user}`);
  console.log(
    `  Pass: ${smtpConfig.auth.pass.substring(0, 3)}...${smtpConfig.auth.pass.slice(-3)}`,
  );
  console.log("");

  try {
    console.log("📡 Intentando crear transporte...");
    const transporter = nodemailer.createTransport(smtpConfig);

    console.log("🔗 Verificando conexión...");
    await transporter.verify();

    console.log("✅ ¡CONEXIÓN EXITOSA!");
    console.log("El servicio SMTP está configurado correctamente");

    process.exit(0);
  } catch (error) {
    console.error("❌ ERROR:");
    if (error instanceof Error) {
      console.error(`   Mensaje: ${error.message}`);
      if ("code" in error) {
        console.error(`   Código: ${(error as any).code}`);
      }
      if (error.stack) {
        console.error(`\n📝 Stack:${error.stack.substring(0, 500)}`);
      }
    } else {
      console.error(error);
    }

    // Proporcionar recomendaciones
    console.error("\n💡 Posibles Causas y Soluciones:");
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("wrong version") || msg.includes("ssl3_get_record")) {
        console.error(
          "   • Error SSL/TLS: Verifica que SMTP_SECURE=false para puerto 587",
        );
      }
      if (msg.includes("authentication") || msg.includes("auth")) {
        console.error("   • Error de Autenticación:");
        console.error(
          '     - Contraseña de Gmail debe ser "contraseña de aplicación", no la regular',
        );
        console.error("     - Verifica que SMTP_USER es un email Gmail real");
        console.error("     - Elimina espacios en blanco de la contraseña");
      }
      if (msg.includes("timeout") || msg.includes("etimedout")) {
        console.error("   • Timeout: Problema de conectividad");
        console.error("     - Verifica Host y Puerto son correctos");
        console.error("     - Revisa firewall/proxy");
      }
    }

    process.exit(1);
  }
}

testSMTP();
