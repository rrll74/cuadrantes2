import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET() {
  try {
    const logoFilename =
      process.env.NEXT_PUBLIC_LOGO_FILENAME ||
      "local-img-logo-orden-trabajo.jpg";

    // Intentar diferentes rutas donde el archivo puede estar
    const possiblePaths = [
      path.join(process.cwd(), "public", logoFilename),
      path.join(process.cwd(), "..", "..", "public", logoFilename),
      path.join(process.cwd(), ".next", "static", "media", logoFilename),
    ];

    let logoPath: string | null = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        logoPath = testPath;
        console.log(`Logo encontrado en: ${logoPath}`);
        break;
      }
    }

    if (!logoPath) {
      console.warn(
        `No se encontró el logo. Archivos buscados: ${logoFilename}`,
      );
      console.warn(`Rutas intentadas:`, possiblePaths);
      return NextResponse.json(
        { error: "Logo no encontrado", searched_paths: possiblePaths },
        { status: 404 },
      );
    }

    const imageBuffer = fs.readFileSync(logoPath);
    const base64 = imageBuffer.toString("base64");

    // Determinar el tipo MIME basado en la extensión del archivo
    const ext = path.extname(logoFilename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };
    const mimeType = mimeTypes[ext] || "image/jpeg";

    return NextResponse.json({
      success: true,
      data: `data:${mimeType};base64,${base64}`,
      filename: logoFilename,
    });
  } catch (error) {
    console.error("Error al cargar el logo:", error);
    return NextResponse.json(
      { error: "Error al cargar el logo", details: String(error) },
      { status: 500 },
    );
  }
}
