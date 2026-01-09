import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class JornadasParserService {
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
}
