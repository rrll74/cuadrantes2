/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import PDFDocument from 'pdfkit';
import {
  ConsultaCuadranteResponseDto,
  NOMBRES_MESES,
} from '@cuadrantes/shared-dto';
import { ColorConverterHelper } from './color-converter.helper';

/**
 * Helper para generar PDFs de consultas de cuadrantes
 */
export class PdfGeneratorHelper {
  /**
   * Genera un PDF con los datos de la consulta
   */
  static async generarPDF(
    datos: ConsultaCuadranteResponseDto,
    mesInicio: number,
    anioInicio: number,
    mesFin: number,
    anioFin: number,
    tipoInicial: boolean,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 20,
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Añadir contenido al PDF
      this.escribirEncabezado(
        doc,
        datos,
        mesInicio,
        anioInicio,
        mesFin,
        anioFin,
        tipoInicial,
      );

      // Escribir tabla de asignaciones y leyenda integrada
      this.escribirTablaConLeyenda(doc, datos);

      doc.end();
    });
  }

  /**
   * Escribe el encabezado del PDF con información general
   */
  private static escribirEncabezado(
    doc: any,
    datos: ConsultaCuadranteResponseDto,
    mesInicio: number,
    anioInicio: number,
    mesFin: number,
    anioFin: number,
    tipoInicial: boolean,
  ): void {
    // Título
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Consulta de Cuadrante', { align: 'center' });
    doc.moveDown(0.3);

    // Información del empleado y cuadrante
    doc.fontSize(10).font('Helvetica');
    doc.text(`Empleado: ${datos.empleado.nombre}`, { continued: true });
    doc.text(`     Cuadrante: ${datos.cuadrante.nombre}`);
    doc.text(`Departamento: ${datos.cuadrante.departamentoNombre}`, {
      continued: true,
    });
    doc.text(`     Tipo: ${tipoInicial ? 'Inicial' : 'Modificado'}`);
    doc.text(
      `Periodo: ${NOMBRES_MESES[mesInicio - 1]} ${anioInicio} - ${NOMBRES_MESES[mesFin - 1]} ${anioFin}`,
    );
    doc.moveDown(0.5);
  }

  /**
   * Escribe la tabla de asignaciones con leyenda integrada
   */
  private static escribirTablaConLeyenda(
    doc: any,
    datos: ConsultaCuadranteResponseDto,
  ): void {
    const startX = 20;
    const monthColWidth = 55;
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right - 10;
    const cellWidth = (pageWidth - monthColWidth) / 31;
    const cellHeight = 16;
    const dayHeaderHeight = 10;
    const monthRowHeight = cellHeight + 2;
    const availableHeight = doc.page.height - doc.page.margins.bottom - 170; // Dejar espacio para leyenda
    const maxMonthsPerPage = Math.floor(availableHeight / monthRowHeight);

    let pageMonthCount = 0;
    let startY = doc.y + 5;
    let currentPage = 1;
    let headerDrawn = false;

    // Iterar por cada mes
    datos.meses.forEach((mes) => {
      // Si alcanzamos el máximo de meses por página, crear nueva página
      if (pageMonthCount >= Math.min(maxMonthsPerPage, 13)) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 20 });
        startY = 40;
        pageMonthCount = 0;
        currentPage++;
        headerDrawn = false;
      }

      // Dibujar encabezado con números de días (solo una vez por página)
      if (!headerDrawn) {
        const headerY = startY;
        // Saltar espacio para el nombre del mes
        doc.fontSize(8).font('Helvetica-Bold');
        for (let dia = 1; dia <= 31; dia++) {
          const x = startX + monthColWidth + (dia - 1) * cellWidth;
          doc.text(dia.toString(), x, headerY - dayHeaderHeight, {
            width: cellWidth,
            align: 'center',
          });
        }
        startY += dayHeaderHeight;
        headerDrawn = true;
      }

      const rowY = startY + pageMonthCount * monthRowHeight - 7;

      // Dibuja la celda del nombre del mes
      doc.rect(startX, rowY, monthColWidth, cellHeight).stroke();
      doc.fontSize(6).font('Helvetica-Bold');
      doc.text(`${mes.mesNombre} ${mes.anio}`, startX + 2, rowY + 2, {
        width: monthColWidth - 4,
        align: 'center',
        height: cellHeight - 4,
      });

      // Dibuja las celdas de asignaciones
      for (let dia = 1; dia <= 31; dia++) {
        const x = startX + monthColWidth + (dia - 1) * cellWidth;
        const y = rowY;

        // Dibujar borde de celda
        doc.rect(x, y, cellWidth, cellHeight).stroke();

        const asig = mes.asignaciones[dia - 1];
        if (asig) {
          PdfGeneratorHelper.dibujarAsignacionEnCeldaCompacta(
            doc,
            asig,
            x,
            y,
            cellWidth,
            cellHeight,
          );
        }
      }

      pageMonthCount++;
    });

    // Dibujar leyenda en la parte inferior de la primera página
    if (currentPage === 1) {
      this.escribirLeyendaCompacta(
        doc,
        datos,
        startY + pageMonthCount * monthRowHeight + 20,
      );
    }
  }

  /**
   * Dibuja una asignación en una celda compacta del PDF
   */
  private static dibujarAsignacionEnCeldaCompacta(
    doc: any,
    asig: any,
    x: number,
    y: number,
    cellWidth: number,
    cellHeight: number,
  ): void {
    // Convertir color numérico a hex
    const colorFondo = ColorConverterHelper.convertToHex(
      (asig.colorfondo as number) || 0,
    );
    const colorTexto = ColorConverterHelper.convertToHex(
      (asig.colortexto as number) || 0,
    );

    // Rellenar fondo
    doc.rect(x + 0.5, y + 0.5, cellWidth - 1, cellHeight - 1).fill(colorFondo);

    // Determinar tamaño de fuente según longitud de la abreviatura
    const abbreviation = asig.abreviatura || '';
    let fontSize = 6.5; // Tamaño por defecto para 3 caracteres o menos
    if (abbreviation.length > 3) {
      // Reducir tamaño proporcionalmente para más de 3 caracteres
      fontSize = Math.max(4, 6.5 - (abbreviation.length - 3) * 0.5);
    }

    // Texto (abreviatura) con tamaño adaptable, centrado verticalmente
    doc.fillColor(colorTexto).fontSize(fontSize).font('Helvetica-Bold');
    doc.text(abbreviation, x + 1, y + 4, {
      width: cellWidth - 2,
      align: 'center',
      height: cellHeight - 2,
    });

    // Resetear color
    doc.fillColor('black');
  }

  /**
   * Escribe la leyenda de estados en formato compacto (2-3 columnas)
   */
  private static escribirLeyendaCompacta(
    doc: any,
    datos: ConsultaCuadranteResponseDto,
    startY: number,
  ): void {
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const columnWidth = pageWidth / 3;
    const boxWidth = 30;
    const boxHeight = 14;
    const itemHeight = 18;

    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Leyenda de Estados:', 20, startY);

    const currentY = startY + 12;
    let columnIndex = 0;
    let itemsInColumn = 0;
    const maxItemsPerColumn = Math.ceil(datos.estadosUsados.length / 3);

    doc.fontSize(6).font('Helvetica');

    datos.estadosUsados.forEach((estado) => {
      const columnX = 20 + columnIndex * columnWidth;
      const itemY = currentY + itemsInColumn * itemHeight;

      const colorFondo = ColorConverterHelper.convertToHex(
        typeof estado.colorfondo === 'number' ? estado.colorfondo : 0,
      );
      const colorTexto = ColorConverterHelper.convertToHex(
        typeof estado.colortexto === 'number' ? estado.colortexto : 0,
      );

      // Cuadro de ejemplo con colores
      doc.rect(columnX, itemY, boxWidth, boxHeight).fill(colorFondo);
      doc.fillColor(colorTexto).fontSize(8).font('Helvetica-Bold');
      doc.text(estado.abreviatura, columnX, itemY + 2.5, {
        width: boxWidth,
        align: 'center',
      });

      // Descripción con horario
      doc.fillColor('black').fontSize(8).font('Helvetica');

      // Mostrar horario solo si no es descanso (00:00:00 - 00:00:00)
      let horario = '';
      if (estado.horainicio && estado.horafin) {
        // Verificar si es horario de descanso
        const esDescanso =
          (estado.horainicio === '00:00:00' && estado.horafin === '00:00:00') ||
          (estado.horainicio === '00:00' && estado.horafin === '00:00');
        if (!esDescanso) {
          horario = ` (${estado.horainicio} - ${estado.horafin})`;
        }
      }

      const descripcion = `${estado.descrip || ''}${horario}`;
      doc.text(descripcion, columnX + boxWidth + 2, itemY + 2, {
        width: columnWidth - boxWidth - 4,
        height: itemHeight - 2,
      });

      itemsInColumn++;

      // Pasar a la siguiente columna
      if (itemsInColumn >= maxItemsPerColumn && columnIndex < 2) {
        columnIndex++;
        itemsInColumn = 0;
      }
    });
  }
}
