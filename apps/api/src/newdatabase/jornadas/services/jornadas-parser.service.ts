import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class JornadasParserService {
  parseExcel(buffer: Buffer): any[] {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  }
}
