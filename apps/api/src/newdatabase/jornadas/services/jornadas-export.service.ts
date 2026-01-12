/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  IResultadoPresencia,
  EstadoPresencia,
  IResultadoSinRuta,
} from '@cuadrantes/shared-dto';

@Injectable()
export class JornadasExportService {
  /**
   * Genera un libro de Excel con los resultados de la casación de jornadas.
   * Aplica formato condicional (colores) según el estado de presencia y formatea fechas/horas.
   *
   * @param results Lista de resultados de presencia a exportar.
   * @param unmatchedResults Lista de fichajes sin ruta a exportar.
   * @returns Buffer con el contenido del archivo Excel.
   */
  async generateExcel(
    results: IResultadoPresencia[],
    unmatchedResults: IResultadoSinRuta[] = [],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Resultados');

    // Definir columnas y anchos
    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Servicio', key: 'servicio', width: 25 },
      { header: 'Turno', key: 'turno', width: 10 },
      { header: 'Equipo', key: 'equipo', width: 10 },
      { header: 'Trabajador', key: 'trabajador', width: 30 },
      { header: 'Puesto', key: 'puesto', width: 15 },
      { header: 'Equal', key: 'equal', width: 10 },
      { header: 'Inicio Plan.', key: 'inicio', width: 12 },
      { header: 'Fin Plan.', key: 'fin', width: 12 },
      { header: 'Entrada Real', key: 'entrada', width: 12 },
      { header: 'Salida Real', key: 'salida', width: 12 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Duplicado', key: 'duplicado', width: 10 },
      { header: 'Revisar', key: 'revisar', width: 10 },
      { header: 'Parte', key: 'parte', width: 10 },
    ];

    // Estilar cabecera (negrita y centrado)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Iterar datos y agregar filas
    results.forEach((res: IResultadoPresencia) => {
      const row = worksheet.addRow({
        fecha: res.ruta.fechaGeneral,
        servicio: res.ruta.servicio,
        turno: res.ruta.turno,
        equipo: res.ruta.equipo,
        trabajador: res.trabajador
          ? `${res.trabajador.nombre} ${res.trabajador.apellido1}`
          : 'Sin asignar',
        puesto: res.trabajador ? `${res.trabajador.puesto}` : 'Sin puesto',
        equal: res.trabajador ? `${res.trabajador.equal}` : '',
        inicio: res.ruta.inicio,
        fin: res.ruta.fin,
        entrada: res.fichajeEntrada,
        salida: res.fichajeSalida,
        estado: res.estado,
        duplicado: res.esDuplicado ? 'SÍ' : '',
        revisar: res.revisar ? 'SÍ' : '',
        parte: res.ruta.partesAsociados,
      });

      // Aplicar formato de fecha y hora
      row.getCell('fecha').numFmt = 'dd/mm/yyyy';
      row.getCell('inicio').numFmt = 'hh:mm';
      row.getCell('fin').numFmt = 'hh:mm';
      row.getCell('entrada').numFmt = 'hh:mm';
      row.getCell('salida').numFmt = 'hh:mm';

      // Aplicar colores según estado (Completo, Incompleto, Sin Presencia)
      const estadoCell = row.getCell('estado');
      let argb = 'FFFFFFFF';
      if ((res.estado as unknown) === EstadoPresencia.COMPLETO)
        argb = 'FFC6EFCE';
      else if ((res.estado as unknown) === EstadoPresencia.INCOMPLETO)
        argb = 'FFFFEB9C';
      else if ((res.estado as unknown) === EstadoPresencia.SIN_PRESENCIA)
        argb = 'FFFFC7CE';

      estadoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb },
      };

      // Alinear celdas al centro
      [
        'fecha',
        'turno',
        'equipo',
        'inicio',
        'fin',
        'entrada',
        'salida',
        'duplicado',
        'revisar',
      ].forEach((key) => {
        row.getCell(key).alignment = {
          vertical: 'middle',
          horizontal: 'center',
        };
      });
    });

    // --- HOJA 2: SIN RUTA ---
    if (unmatchedResults && unmatchedResults.length > 0) {
      const wsUnmatched = workbook.addWorksheet('Sin Ruta');

      wsUnmatched.columns = [
        { header: 'Fecha', key: 'fecha', width: 12 },
        { header: 'Trabajador', key: 'trabajador', width: 30 },
        { header: 'Puesto', key: 'puesto', width: 15 },
        { header: 'Entrada', key: 'entrada', width: 12 },
        { header: 'Salida', key: 'salida', width: 12 },
        { header: 'Estado', key: 'estado', width: 15 },
      ];

      const headerRowUnmatched = wsUnmatched.getRow(1);
      headerRowUnmatched.font = { bold: true };
      headerRowUnmatched.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      unmatchedResults.forEach((res: IResultadoSinRuta) => {
        const row = wsUnmatched.addRow({
          fecha: res.fecha,
          trabajador: res.trabajador
            ? `${res.trabajador.nombre} ${res.trabajador.apellido1}`
            : 'Sin asignar',
          puesto: res.trabajador ? res.trabajador.puesto : '',
          entrada: res.fichajeEntrada,
          salida: res.fichajeSalida,
          estado: res.estado,
        });

        row.getCell('fecha').numFmt = 'dd/mm/yyyy';
        row.getCell('entrada').numFmt = 'hh:mm';
        row.getCell('salida').numFmt = 'hh:mm';

        const estadoCell = row.getCell('estado');
        let argb = 'FFFFFFFF';
        if (res.estado === EstadoPresencia.COMPLETO) argb = 'FFC6EFCE';
        else if (res.estado === EstadoPresencia.INCOMPLETO) argb = 'FFFFEB9C';
        else if (res.estado === EstadoPresencia.SIN_PRESENCIA)
          argb = 'FFFFC7CE';

        estadoCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb },
        };

        row.getCell('fecha').alignment = { horizontal: 'center' };
        row.getCell('estado').alignment = { horizontal: 'center' };
      });
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
