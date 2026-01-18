/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  IResultadoPresencia,
  EstadoPresencia,
  IResultadoSinRuta,
} from '@cuadrantes/shared-dto';
import { ImportSession } from '../entities/import-session.entity';

// FIXME: Arreglar las fechas que se exponen en el excel porque resultan en un día menos y una hora menos

@Injectable()
export class JornadasExportService {
  /**
   * Genera un libro de Excel con los resultados de la casación de jornadas.
   * Aplica formato condicional (colores) según el estado de presencia y formatea fechas/horas.
   *
   * @param results Lista de resultados de presencia a exportar.
   * @param unmatchedResults Lista de fichajes sin ruta a exportar.
   * @param session Información de la sesión (opcional) para incluir en una hoja resumen.
   * @param summaryTable Datos de la tabla resumen por equipos (opcional).
   * @param serviceSummary Datos de la tabla resumen por servicios (opcional).
   * @param equalPuestoSummary Datos de la tabla resumen por puesto y equal (opcional).
   * @param statusPartsSummary Datos de la tabla resumen por estado y partes (opcional).
   * @returns Buffer con el contenido del archivo Excel.
   */
  async generateExcel(
    results: IResultadoPresencia[],
    unmatchedResults: IResultadoSinRuta[] = [],
    session?: ImportSession | null,
    summaryTable?: {
      columns: { label: string; key: string }[];
      rows: any[];
      footer: any;
    },
    serviceSummary?: { rows: any[]; total: number },
    equalPuestoSummary?: { rows: any[]; total: number },
    statusPartsSummary?: { rows: any[]; footer: any },
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
          ? `${res.trabajador.apellido1} ${res.trabajador.apellido2}, ${res.trabajador.nombre}`
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
            ? `${res.trabajador.apellido1} ${res.trabajador.apellido2}, ${res.trabajador.nombre}`
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

    // --- HOJA 3: INFORMACIÓN SESIÓN ---

    // TODO: Agregar los datos correspondientes a los cálculos de jornadas mínimas para el cumplimiento

    if (session) {
      const wsInfo = workbook.addWorksheet('Información Sesión');

      wsInfo.columns = [
        { header: 'Concepto', key: 'key', width: 35 },
        { header: 'Valor', key: 'value', width: 50 },
      ];

      const headerRow = wsInfo.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'left' };

      const rows = [
        { key: 'ID Sesión', value: session.id },
        { key: 'Fecha de Importación', value: session.createdAt },
        { key: 'Temporada', value: session.isHighSeason ? 'Alta' : 'Baja' },
        { key: 'Días Lunes-Viernes', value: session.daysMonFri },
        { key: 'Jornadas Lunes-Viernes', value: session.shiftsMonFri },
        {
          key: 'Días Sábados-Domingos-Festivos',
          value: session.daysSatSunHol,
        },
        {
          key: 'Jornadas Sábados-Domingos-Festivos',
          value: session.shiftsSatSunHol,
        },
        {
          key: 'Servicios a Descontar',
          value: session.discountServices || '-',
        },
        { key: 'Equipos a Descontar', value: session.discountTeams || '-' },
      ];

      rows.forEach((r) => {
        const row = wsInfo.addRow(r);
        if (r.key === 'Fecha de Importación') {
          row.getCell('value').numFmt = 'dd/mm/yyyy hh:mm';
        }
      });
    }

    // --- HOJA 4: TABLA POR EQUIPOS ---
    // TODO: Incluir colores en las celdas dependiendo si el horario de fichaje es correcto o tiene deficiencias

    // TODO: Incluir columna y fila final de sumatorio de horas

    if (summaryTable && summaryTable.columns && summaryTable.rows) {
      const wsSummary = workbook.addWorksheet('Tabla Equipos');

      // Definir columnas
      const excelColumns = [
        { header: 'Servicio', key: 'servicio', width: 25 },
        { header: 'Equipo', key: 'equipo', width: 20 },
        ...summaryTable.columns.map((col) => ({
          header: col.label,
          key: col.key,
          width: 8,
        })),
        { header: 'Total', key: 'total', width: 10 },
      ];

      wsSummary.columns = excelColumns;

      // Estilar cabecera
      const headerRow = wsSummary.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Agregar filas
      summaryTable.rows.forEach((rowData: any) => {
        wsSummary.addRow(rowData);
      });

      // Agregar Footer (Totales)
      if (summaryTable?.footer) {
        const footerRow = wsSummary.addRow(summaryTable.footer);
        footerRow.font = { bold: true };
        footerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }, // Gris claro
          };
          cell.alignment = { horizontal: 'center' };
        });
      }
    }

    // --- HOJA 5: RESUMEN POR SERVICIOS ---
    if (serviceSummary && serviceSummary.rows) {
      const wsService = workbook.addWorksheet('Resumen Servicios');

      wsService.columns = [
        { header: 'Servicio', key: 'servicio', width: 35 },
        { header: 'Jornadas (Horas / 7)', key: 'jornadas', width: 20 },
      ];

      const headerRow = wsService.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      serviceSummary.rows.forEach((row: any) => {
        wsService.addRow(row);
      });

      // Footer (Total)
      if (serviceSummary.total !== undefined) {
        const footerRow = wsService.addRow({
          servicio: 'TOTAL',
          jornadas: serviceSummary.total,
        });
        footerRow.font = { bold: true };
        footerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' },
          };
        });
      }
    }

    // --- HOJA 6: RESUMEN PUESTO/EQUAL ---
    if (equalPuestoSummary && equalPuestoSummary.rows) {
      const wsEqual = workbook.addWorksheet('Resumen Puesto-Equal');

      wsEqual.columns = [
        { header: 'Puesto', key: 'puesto', width: 30 },
        { header: 'Equal', key: 'equal', width: 10 },
        { header: 'Jornadas (Horas / 7)', key: 'jornadas', width: 20 },
      ];

      const headerRow = wsEqual.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      equalPuestoSummary.rows.forEach((row: any) => {
        wsEqual.addRow(row);
      });

      // Footer (Total)
      if (equalPuestoSummary.total !== undefined) {
        const footerRow = wsEqual.addRow({
          puesto: 'TOTAL',
          equal: '',
          jornadas: equalPuestoSummary.total,
        });
        footerRow.font = { bold: true };
        footerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' },
          };
        });
      }
    }

    // --- HOJA 7: RESUMEN ESTADO/PARTES ---
    if (statusPartsSummary && statusPartsSummary.rows) {
      const wsStatus = workbook.addWorksheet('Resumen Estado-Partes');

      wsStatus.columns = [
        { header: 'Estado', key: 'estado', width: 20 },
        { header: 'Sin Partes (Cant)', key: 'noPartsCount', width: 18 },
        { header: 'Sin Partes (%)', key: 'noPartsPercent', width: 15 },
        { header: 'Con Partes (Cant)', key: 'withPartsCount', width: 18 },
        { header: 'Con Partes (%)', key: 'withPartsPercent', width: 15 },
      ];

      const headerRow = wsStatus.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      statusPartsSummary.rows.forEach((row: any) => {
        wsStatus.addRow(row);
      });

      // Footer (Total)
      if (statusPartsSummary?.footer) {
        const footerRow = wsStatus.addRow({
          estado: 'TOTAL',
          noPartsCount: statusPartsSummary.footer.noPartsCount,
          noPartsPercent: statusPartsSummary.footer.noPartsPercent,
          withPartsCount: statusPartsSummary.footer.withPartsCount,
          withPartsPercent: statusPartsSummary.footer.withPartsPercent,
        });
        footerRow.font = { bold: true };
        footerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' },
          };
          cell.alignment = { horizontal: 'center' };
        });
      }
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
