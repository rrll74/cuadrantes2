import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { EXCEL_COLUMNS } from '@cuadrantes/shared-dto';

@Injectable()
export class JornadasParserService {
  private readonly logger = new Logger(JornadasParserService.name);

  parseExcel(filePath: string): any[] {
    // parseExcel(buffer: Buffer): any[] {
    //   const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    //   const sheetName = workbook.SheetNames[0];
    //   return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // 'cellDates: true' convierte los números seriales de Excel a objetos Date de JS
    const workbook = XLSX.readFile(filePath, { cellDates: true });

    // Asumimos que los datos están en la primera hoja
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convierte la hoja a un array de objetos JSON
    // La primera fila del Excel se usa como las claves (keys) del objeto
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: null, // Pone null en celdas vacías en lugar de omitir la clave
    });

    return jsonData;
  }

  /**
   * Valida los headers del Excel según el tipo de importación
   * @param data Array de objetos parseados del Excel
   * @param fileType Tipo de archivo (trabajadores, fichajes, rutas, etc.)
   * @param importType Tipo de importación (1: primaria, 2: secundaria)
   */
  validateHeaders(data: any[], fileType: string, importType: number): boolean {
    if (data.length === 0) {
      throw new BadRequestException(`El archivo ${fileType} está vacío`);
    }

    const firstRow = data[0] as Record<string, unknown> | null;
    const headers = Object.keys(firstRow || {});

    if (headers.length === 0) {
      throw new BadRequestException(
        `No se encontraron encabezados en el archivo ${fileType}`,
      );
    }

    let expectedColumns: string[] = [];

    const PRIMARY_TYPE = 1;
    const SECONDARY_TYPE = 2;

    if (importType === PRIMARY_TYPE) {
      // Validación para tipo primario
      switch (fileType) {
        case 'trabajadores':
          expectedColumns = Object.values(EXCEL_COLUMNS.TRABAJADOR);
          break;
        case 'fichajes':
          expectedColumns = Object.values(EXCEL_COLUMNS.FICHAJE);
          break;
        case 'titulares':
          expectedColumns = Object.values(EXCEL_COLUMNS.RUTATITULAR);
          break;
        case 'auxiliares':
          expectedColumns = Object.values(EXCEL_COLUMNS.RUTAAUXILIAR);
          break;
        default:
          throw new BadRequestException(
            `Tipo de archivo desconocido: ${fileType}`,
          );
      }
    } else if (importType === SECONDARY_TYPE) {
      // Validación para tipo secundario
      switch (fileType) {
        case 'trabajadores':
          expectedColumns = Object.values(EXCEL_COLUMNS.TRABAJADOR_TIPO2);
          break;
        case 'fichajes':
          expectedColumns = Object.values(EXCEL_COLUMNS.FICHAJE_TIPO2);
          break;
        case 'rutas':
          expectedColumns = Object.values(EXCEL_COLUMNS.RUTA_TIPO2);
          break;
        default:
          throw new BadRequestException(
            `Tipo de archivo desconocido para importación tipo 2: ${fileType}`,
          );
      }
    } else {
      throw new BadRequestException(
        `Tipo de importación inválido: ${importType}`,
      );
    }

    // Verificar que todos los headers esperados estén presentes (sin importar mayúsculas/espacios)
    const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
    const normalizedExpected = expectedColumns.map((c) =>
      c.trim().toLowerCase(),
    );

    const missingColumns = normalizedExpected.filter(
      (col) => !normalizedHeaders.includes(col),
    );

    if (missingColumns.length > 0) {
      throw new BadRequestException(
        `Faltan columnas en ${fileType}: ${missingColumns.join(', ')}. Esperadas: ${normalizedExpected.join(', ')}`,
      );
    }

    this.logger.log(
      `Headers validados correctamente para ${fileType} (tipo ${importType})`,
    );
    return true;
  }

  /**
   * Extrae información combinada del trabajador (formato tipo 2)
   * Formato esperado: "[id] - [Apellido1 Apellido2], [Nombre] ([Puesto]) ([id])"
   * @param trabajadorCombined String con la información combinada
   * @returns Objeto con id, nombre, apellidos y puesto extraídos
   */
  parseWorkerCombined(trabajadorCombined: string): {
    id: string;
    nombre: string;
    apellidos: string;
    puesto: string;
  } {
    // Patrón: "123 - Apellido1 Apellido2, Nombre (Puesto) (123)"
    const pattern =
      /^(\d+)\s*-\s*([^,]+),\s*([^(]+)\s*\(\s*([^)]+)\s*\)\s*\(\s*\d+\s*\)$/;

    const match = trabajadorCombined.trim().match(pattern);

    if (!match) {
      throw new BadRequestException(
        `Formato inválido en columna "Trabajador": ${trabajadorCombined}. Esperado: "[id] - [Apellido1 Apellido2], [Nombre] ([Puesto]) ([id])"`,
      );
    }

    return {
      id: match[1],
      apellidos: match[2].trim(),
      nombre: match[3].trim(),
      puesto: match[4].trim(),
    };
  }
}
