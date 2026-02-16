import {
  ConsultaCuadranteResponseDto,
  NOMBRES_MESES,
} from '@cuadrantes/shared-dto';
import { ColorConverterHelper } from './color-converter.helper';

/**
 * Helper para generar contenido HTML de emails con consultas de cuadrantes
 */
export class EmailGeneratorHelper {
  /**
   * Genera el contenido HTML del email con los datos de la consulta
   */
  static generarHtmlEmail(
    datos: ConsultaCuadranteResponseDto,
    mesInicio: number,
    anioInicio: number,
    mesFin: number,
    anioFin: number,
    tipoInicial: boolean,
  ): string {
    const periodoText = `${NOMBRES_MESES[mesInicio - 1]} ${anioInicio} - ${NOMBRES_MESES[mesFin - 1]} ${anioFin}`;
    const tipoText = tipoInicial ? 'Inicial' : 'Modificado';
    const estadosHtml = this.generarFilasEstados(datos);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              color: #2c3e50;
              border-bottom: 2px solid #3498db;
              padding-bottom: 10px;
            }
            .section {
              margin: 20px 0;
              padding: 15px;
              background-color: #f9f9f9;
              border-left: 4px solid #3498db;
            }
            .info-row {
              margin: 8px 0;
            }
            .label {
              font-weight: bold;
              color: #2c3e50;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th {
              background-color: #3498db;
              color: white;
              padding: 12px;
              text-align: left;
            }
            td {
              padding: 10px;
              border: 1px solid #ddd;
            }
            .footer {
              margin-top: 20px;
              padding-top: 15px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #7f8c8d;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Consulta de Cuadrante</h1>
            
            <div class="section">
              <div class="info-row">
                <span class="label">Empleado:</span> ${datos.empleado.nombre}
              </div>
              <div class="info-row">
                <span class="label">NIFs:</span> ${datos.empleado.nif}
              </div>
              <div class="info-row">
                <span class="label">Email:</span> ${datos.empleado.email}
              </div>
            </div>

            <div class="section">
              <div class="info-row">
                <span class="label">Cuadrante:</span> ${datos.cuadrante.nombre}
              </div>
              <div class="info-row">
                <span class="label">Departamento:</span> ${datos.cuadrante.departamentoNombre}
              </div>
              <div class="info-row">
                <span class="label">Tipo:</span> ${tipoText}
              </div>
              <div class="info-row">
                <span class="label">Período:</span> ${periodoText}
              </div>
            </div>

            <div class="section">
              <h3 style="margin-top: 0;">Leyenda de Estados</h3>
              <table>
                <thead>
                  <tr>
                    <th>Abreviatura</th>
                    <th>Descripción</th>
                    <th>Horario</th>
                  </tr>
                </thead>
                <tbody>
                  ${estadosHtml}
                </tbody>
              </table>
            </div>

            <div class="section">
              <p>
                Consulta generada automáticamente por el sistema Cuadrantes2.
                Para más detalles, accede a la plataforma web.
              </p>
            </div>

            <div class="footer">
              <p>Este es un mensaje automático. Por favor, no responda a este correo.</p>
              <p>Generado el ${new Date().toLocaleString('es-ES')}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Genera las filas de la tabla de estados para el email
   */
  private static generarFilasEstados(
    datos: ConsultaCuadranteResponseDto,
  ): string {
    let estadosHtml = '';
    datos.estadosUsados.forEach((estado) => {
      const colorFondo = ColorConverterHelper.convertToHex(
        typeof estado.colorfondo === 'number' ? estado.colorfondo : 0,
      );
      const colorTexto = ColorConverterHelper.convertToHex(
        typeof estado.colortexto === 'number' ? estado.colortexto : 0,
      );
      const horario =
        estado.horainicio && estado.horafin
          ? `${estado.horainicio} - ${estado.horafin}`
          : 'N/A';

      estadosHtml += `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">
            <span style="background-color: ${colorFondo}; color: ${colorTexto}; padding: 5px 10px; border-radius: 3px; font-weight: bold;">
              ${estado.abreviatura}
            </span>
          </td>
          <td style="padding: 10px; border: 1px solid #ddd;">${estado.descrip || 'N/A'}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${horario}</td>
        </tr>
      `;
    });
    return estadosHtml;
  }
}
