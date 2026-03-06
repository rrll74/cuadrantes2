import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { ROUTE_DOCUMENT_PATTERN } from '@cuadrantes/shared-dto';

const routeDocumentPattern = ROUTE_DOCUMENT_PATTERN;

/**
 * Servicio para parsear el archivo de texto plano "Rutas con documento (Txt)"
 * Formato esperado: cada línea contiene "Hoja {numero}.{extension}"
 * Ejemplo: "Hoja 123.pdf" o "Hoja 456.webp"
 */
@Injectable()
export class JornadasTextParserService {
  private readonly logger = new Logger(JornadasTextParserService.name);

  /**
   * Parsea un archivo de texto y extrae los números de ruta que tienen documentos asociados
   * @param filePath Ruta del archivo de texto
   * @returns Set de números de ruta que tienen documentos
   */
  parseTextFile(filePath: string): Set<number> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const routes = new Set<number>();

      const lines = fileContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      for (const line of lines) {
        const match = line.match(routeDocumentPattern);
        if (match) {
          const routeNumber = parseInt(match[1], 10);
          routes.add(routeNumber);
          this.logger.debug(
            `Ruta con documento encontrada: ${routeNumber}.${match[2]}`,
          );
        } else {
          this.logger.warn(`Línea no válida en archivo de documentos: ${line}`);
        }
      }

      this.logger.log(
        `Se encontraron ${routes.size} rutas con documentos asociados`,
      );
      return routes;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al parsear archivo de texto: ${errorMessage}`);
      throw new BadRequestException(
        'Error al procesar archivo de rutas con documento',
      );
    }
  }

  /**
   * Valida que el formato del archivo de texto sea correcto
   * @param filePath Ruta del archivo de texto
   * @returns true si el archivo tiene formato válido
   */
  validateTextFile(filePath: string): boolean {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        return true; // Archivo vacío es válido (sin documentos)
      }

      // Validar que todas las líneas tienen el formato esperado
      for (const line of lines) {
        if (!routeDocumentPattern.test(line)) {
          this.logger.warn(
            `Formato inválido en línea: ${line}. Esperado: "Hoja {numero}.{extension}"`,
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al validar archivo de texto: ${errorMessage}`);
      return false;
    }
  }
}
