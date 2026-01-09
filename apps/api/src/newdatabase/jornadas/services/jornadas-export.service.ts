import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { IResultadoPresencia, EstadoPresencia } from '@cuadrantes/shared-dto';

@Injectable()
export class JornadasExportService {
  /**
   * Genera un libro de Excel con los resultados de la casación de jornadas.
   * Aplica formato condicional (colores) según el estado de presencia y formatea fechas/horas.
   *
   * @param results Lista de resultados de presencia a exportar.
   * @returns Buffer con el contenido del archivo Excel.
   */
  async generateExcel(results: IResultadoPresencia[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Resultados');

    // Definir columnas y anchos
    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Servicio', key: 'servicio', width: 25 },
      { header: 'Turno', key: 'turno', width: 10 },
      { header: 'Equipo', key: 'equipo', width: 10 },
      { header: 'Trabajador', key: 'trabajador', width: 30 },
      { header: 'Inicio Plan.', key: 'inicio', width: 12 },
      { header: 'Fin Plan.', key: 'fin', width: 12 },
      { header: 'Entrada Real', key: 'entrada', width: 12 },
      { header: 'Salida Real', key: 'salida', width: 12 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Duplicado', key: 'duplicado', width: 10 },
      { header: 'Revisar', key: 'revisar', width: 10 },
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
        inicio: res.ruta.inicio,
        fin: res.ruta.fin,
        entrada: res.fichajeEntrada,
        salida: res.fichajeSalida,
        estado: res.estado,
        duplicado: res.esDuplicado ? 'SÍ' : '',
        revisar: res.revisar ? 'SÍ' : '',
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

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
