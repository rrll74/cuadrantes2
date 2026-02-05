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

@Injectable()
export class JornadasExportService {
  /**
   * Corrige una fecha para su exportación a Excel.
   * Al pasar un objeto `Date` de JavaScript a `exceljs`, la librería lo trata como UTC.
   * Esto causa que las fechas se muestren con un desfase horario (ej. una hora antes en CET).
   * Esta función ajusta la fecha restándole el desfase de la zona horaria local,
   * "engañando" a `exceljs` para que muestre la hora local correcta.
   * @param date La fecha a corregir.
   * @returns La fecha corregida o null si la entrada es null.
   */
  private toLocalExcelDate(date: Date | null): Date | null {
    if (!date) {
      return null;
    }
    // El error 'TypeError: date.getTime is not a function' ocurre si 'date' es un string.
    // Esto puede pasar si los datos de fecha vienen de la base de datos como texto.
    // Creamos un nuevo objeto Date para manejar tanto strings como objetos Date.
    const dateObj = new Date(date);

    // Si el string de entrada no era una fecha válida, `new Date()` crea un objeto
    // de fecha inválido. Lo comprobamos para evitar errores en el Excel.
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    return new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
  }
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
      discountedRows?: any[];
      discountedFooter?: any;
    },
    serviceSummary?: {
      rows: any[];
      total: number;
      discountedRows?: any[];
      discountedTotal?: number;
    },
    equalPuestoSummary?: {
      rows: any[];
      total: number;
      discountedRows?: any[];
      discountedTotal?: number;
    },
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
      { header: 'Descontado', key: 'descontado', width: 12 },
    ];

    // Estilar cabecera (negrita y centrado)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Iterar datos y agregar filas
    results.forEach((res: IResultadoPresencia) => {
      const row = worksheet.addRow({
        fecha: this.toLocalExcelDate(res.ruta.fechaGeneral),
        servicio: res.ruta.servicio,
        turno: res.ruta.turno,
        equipo: res.ruta.equipo,
        trabajador: res.trabajador
          ? `${res.trabajador.apellido1} ${res.trabajador.apellido2}, ${res.trabajador.nombre}`
          : 'Sin asignar',
        puesto: res.trabajador ? `${res.trabajador.puesto}` : 'Sin puesto',
        equal: res.trabajador ? `${res.trabajador.equal}` : '',
        inicio: this.toLocalExcelDate(res.ruta.inicio),
        fin: this.toLocalExcelDate(res.ruta.fin),
        entrada: this.toLocalExcelDate(res.fichajeEntrada),
        salida: this.toLocalExcelDate(res.fichajeSalida),
        estado: res.estado,
        duplicado: res.esDuplicado ? 'SÍ' : '',
        revisar: res.revisar ? 'SÍ' : '',
        parte: res.ruta.partesAsociados,
        descontado: (res as any).isDiscounted ? 'Sí' : 'No',
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
        'equal',
        'inicio',
        'fin',
        'entrada',
        'salida',
        'duplicado',
        'revisar',
        'descontado',
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
          fecha: this.toLocalExcelDate(res.fecha),
          trabajador: res.trabajador
            ? `${res.trabajador.apellido1} ${res.trabajador.apellido2}, ${res.trabajador.nombre}`
            : 'Sin asignar',
          puesto: res.trabajador ? res.trabajador.puesto : '',
          entrada: this.toLocalExcelDate(res.fichajeEntrada),
          salida: this.toLocalExcelDate(res.fichajeSalida),
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

    if (session) {
      const wsInfo = workbook.addWorksheet('Información Sesión');

      wsInfo.columns = [
        { header: 'Concepto', key: 'key', width: 35 },
        { header: 'Valor', key: 'value', width: 50 },
      ];

      const headerRow = wsInfo.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'left' };

      const minJornadas =
        (Number(session.shiftsMonFri) * Number(session.daysMonFri) || 0) +
        (Number(session.shiftsSatSunHol) * Number(session.daysSatSunHol) || 0);

      const rows = [
        { key: 'ID Sesión', value: session.id },
        {
          key: 'Fecha de Importación',
          value: this.toLocalExcelDate(session.createdAt),
        },
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
          key: 'Total Jornadas Mínimas para cumplimiento',
          value: minJornadas,
        },
        {
          key: 'Servicios a Descontar',
          value: session.discountServices || '-',
        },
        { key: 'Equipos a Descontar', value: session.discountTeams || '-' },
      ];

      if (serviceSummary) {
        rows.push({
          key: 'Total Jornadas Realizadas',
          value: serviceSummary.total,
        });
        rows.push({
          key: 'Diferencia (Realizado - Mínimo)',
          value: serviceSummary.total - minJornadas,
        });
      }

      rows.forEach((r) => {
        const row = wsInfo.addRow(r);
        if (r.key === 'Fecha de Importación') {
          row.getCell('value').numFmt = 'dd/mm/yyyy hh:mm';
        }
        if (r.key === 'Diferencia (Realizado - Mínimo)') {
          const val = Number(r.value);
          // Azul si >= 0, Rojo si < 0
          const color = val >= 0 ? 'FF0000FF' : 'FFFF0000';
          row.getCell('value').font = { color: { argb: color }, bold: true };
        }
      });
    }

    // --- HOJA 4: TABLA POR EQUIPOS ---
    if (summaryTable && summaryTable.columns && summaryTable.rows) {
      const wsSummary = workbook.addWorksheet('Tabla Equipos');

      // Definir columnas: Servicio, Equipo, fechas con sufijo _value, Total_value
      const excelColumns = [
        { header: 'Servicio', key: 'servicio', width: 25 },
        { header: 'Equipo', key: 'equipo', width: 20 },
        ...summaryTable.columns.map((col) => ({
          header: col.label,
          key: col.key,
          width: 8,
        })),
        { header: 'Total', key: 'total_value', width: 10 },
      ];

      wsSummary.columns = excelColumns;

      // Estilar cabecera
      const headerRow = wsSummary.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Mapeo de colores a códigos ARGB de Excel
      const colorMap = {
        green: 'FFC6EFCE', // Verde claro
        yellow: 'FFFFEB9C', // Amarillo claro
        red: 'FFFFC7CE', // Rojo claro
      };

      // Agregar filas con colores
      const addRowsToSheet = (rows: any[]) => {
        rows.forEach((rowData: any) => {
          // Transformar datos: mapear ${dateKey}_value a dateKey para que coincida con las columnas
          const transformedRow: any = {
            servicio: rowData.servicio,
            equipo: rowData.equipo,
            total_value: rowData.total_value,
          };

          summaryTable.columns.forEach((col) => {
            transformedRow[col.key] = rowData[`${col.key}_value`];
          });

          const excelRow = wsSummary.addRow(transformedRow);

          // Aplicar colores a las celdas de datos
          summaryTable.columns.forEach((col) => {
            const colorKey = `${col.key}_color`;
            const color = rowData[colorKey] as
              | 'green'
              | 'yellow'
              | 'red'
              | undefined;

            if (color && colorMap[color]) {
              excelRow.getCell(col.key).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colorMap[color] },
              };
            }

            excelRow.getCell(col.key).alignment = { horizontal: 'center' };
          });

          // Aplicar color al total de la fila
          const totalColor = rowData.total_color as
            | 'green'
            | 'yellow'
            | 'red'
            | undefined;
          if (totalColor && colorMap[totalColor]) {
            excelRow.getCell('total_value').fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: colorMap[totalColor] },
            };
          }
          excelRow.getCell('total_value').alignment = { horizontal: 'center' };
          excelRow.getCell('total_value').font = { bold: true };
        });
      };

      addRowsToSheet(summaryTable.rows);

      const addFooterToSheet = (footer: any, isDiscounted = false) => {
        // Transformar datos del footer igual que las filas
        const transformedFooter: any = {
          servicio: summaryTable.footer.servicio,
          equipo: summaryTable.footer.equipo,
          total_value: summaryTable.footer.total_value,
        };

        summaryTable.columns.forEach((col) => {
          transformedFooter[col.key] = summaryTable.footer[`${col.key}_value`];
          transformedFooter[col.key] = footer[`${col.key}_value`];
        });

        const footerRow = wsSummary.addRow(transformedFooter);

        // Aplicar colores específicos al footer
        summaryTable.columns.forEach((col) => {
          const colorKey = `${col.key}_color`;
          const color = summaryTable.footer[colorKey] as
            | 'green'
            | 'yellow'
            | 'red'
            | undefined;

          if (color && colorMap[color]) {
            footerRow.getCell(col.key).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: colorMap[color] },
            };
          }

          footerRow.getCell(col.key).alignment = { horizontal: 'center' };
        });

        // Color del total general
        const totalColor = summaryTable.footer.total_color as
          | 'green'
          | 'yellow'
          | 'red'
          | undefined;
        const totalColorToUse = footer.total_color || totalColor;

        if (totalColorToUse && colorMap[totalColorToUse]) {
          footerRow.getCell('total_value').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: colorMap[totalColorToUse] },
          };
        }
        footerRow.getCell('total_value').alignment = { horizontal: 'center' };

        // Estilos específicos para el footer
        footerRow.font = {
          bold: true,
          color: isDiscounted ? { argb: 'FF990000' } : undefined,
        };
        if (isDiscounted) {
          footerRow.eachCell((cell) => {
            if (!cell.fill) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFE0E0' },
              };
            }
          });
        }
      };

      // Agregar Footer (Totales) con colores
      if (summaryTable?.footer) {
        addFooterToSheet(summaryTable.footer);
      }

      // --- TABLA DESCONTADA (Si existe) ---
      if (
        summaryTable.discountedRows &&
        summaryTable.discountedRows.length > 0
      ) {
        wsSummary.addRow([]); // Separador
        wsSummary.addRow([]); // Separador
        const headerDiscounted = wsSummary.addRow([
          'Equipos Descontados (No computan)',
        ]);
        headerDiscounted.font = { bold: true, color: { argb: 'FF990000' } };

        addRowsToSheet(summaryTable.discountedRows);

        if (summaryTable.discountedFooter) {
          // CORRECCIÓN: Pasar summaryTable.discountedFooter en lugar de reutilizar el footer original
          const transformedDiscountedFooter: any = {
            servicio: summaryTable.discountedFooter.servicio,
            equipo: summaryTable.discountedFooter.equipo,
            total_value: summaryTable.discountedFooter.total_value,
          };

          summaryTable.columns.forEach((col) => {
            transformedDiscountedFooter[col.key] =
              summaryTable.discountedFooter[`${col.key}_value`];
          });

          const footerRow = wsSummary.addRow(transformedDiscountedFooter);

          // Aplicar colores específicos al footer descontado
          summaryTable.columns.forEach((col) => {
            const colorKey = `${col.key}_color`;
            const color = summaryTable.discountedFooter[colorKey] as
              | 'green'
              | 'yellow'
              | 'red'
              | undefined;

            if (color && colorMap[color]) {
              footerRow.getCell(col.key).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colorMap[color] },
              };
            }

            footerRow.getCell(col.key).alignment = { horizontal: 'center' };
          });

          // Color del total general descontado
          const totalColor = summaryTable.discountedFooter.total_color as
            | 'green'
            | 'yellow'
            | 'red'
            | undefined;

          if (totalColor && colorMap[totalColor]) {
            footerRow.getCell('total_value').fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: colorMap[totalColor] },
            };
          }
          footerRow.getCell('total_value').alignment = { horizontal: 'center' };

          // Estilos específicos para el footer descontado
          footerRow.font = {
            bold: true,
            color: { argb: 'FF990000' },
          };
          footerRow.eachCell((cell) => {
            if (!cell.fill) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFE0E0' },
              };
            }
          });
        }
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

      // Tabla de Servicios Descontados (si existen)
      if (
        serviceSummary.discountedRows &&
        serviceSummary.discountedRows.length > 0
      ) {
        wsService.addRow([]); // Fila vacía separadora
        wsService.addRow([]); // Fila vacía separadora

        const headerDiscounted = wsService.addRow([
          'Servicios Descontados (No computan)',
        ]);
        headerDiscounted.font = { bold: true, color: { argb: 'FF990000' } }; // Rojo oscuro

        // Cabecera de columnas para la tabla descontada
        const subHeader = wsService.addRow({
          servicio: 'Servicio',
          jornadas: 'Jornadas',
        });
        subHeader.font = { bold: true };
        subHeader.alignment = { vertical: 'middle', horizontal: 'center' };

        serviceSummary.discountedRows.forEach((row: any) => {
          wsService.addRow(row);
        });

        if (serviceSummary.discountedTotal !== undefined) {
          const footerRow = wsService.addRow({
            servicio: 'TOTAL DESCONTADO',
            jornadas: serviceSummary.discountedTotal,
          });
          footerRow.font = { bold: true, color: { argb: 'FF990000' } };
          footerRow.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFE0E0' },
            }; // Fondo rojo claro
          });
        }
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

      // Tabla de Puestos Descontados (si existen)
      if (
        equalPuestoSummary.discountedRows &&
        equalPuestoSummary.discountedRows.length > 0
      ) {
        wsEqual.addRow([]); // Fila vacía separadora
        wsEqual.addRow([]); // Fila vacía separadora

        const headerDiscounted = wsEqual.addRow([
          'Puestos Descontados (No computan)',
        ]);
        headerDiscounted.font = { bold: true, color: { argb: 'FF990000' } }; // Rojo oscuro

        // Cabecera de columnas para la tabla descontada
        const subHeader = wsEqual.addRow({
          puesto: 'Puesto',
          equal: 'Equal',
          jornadas: 'Jornadas',
        });
        subHeader.font = { bold: true };
        subHeader.alignment = { vertical: 'middle', horizontal: 'center' };

        equalPuestoSummary.discountedRows.forEach((row: any) => {
          wsEqual.addRow(row);
        });

        if (equalPuestoSummary.discountedTotal !== undefined) {
          const footerRow = wsEqual.addRow({
            puesto: 'TOTAL DESCONTADO',
            equal: '',
            jornadas: equalPuestoSummary.discountedTotal,
          });
          footerRow.font = { bold: true, color: { argb: 'FF990000' } };
          footerRow.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFE0E0' },
            }; // Fondo rojo claro
          });
        }
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
