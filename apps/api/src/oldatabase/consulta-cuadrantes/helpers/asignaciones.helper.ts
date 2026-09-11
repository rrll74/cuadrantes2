import { OldAsignacion } from '@/oldatabase/asignaciones/entities/oldasignacion.entity';
import { OldEstado } from '@/oldatabase/estados/entities/oldestado.entity';
import {
  MesAsignacionesDto,
  AsignacionDiaDto,
  NOMBRES_MESES,
} from '@cuadrantes/shared-dto';

/**
 * Helper para procesar y construir asignaciones de empleados
 */
export class AsignacionesHelper {
  /**
   * Construye el array de meses con asignaciones ordenadas
   * @param mesInicio Mes de inicio (1-12)
   * @param anioInicio Año de inicio
   * @param mesFin Mes final (1-12)
   * @param anioFin Año final
   * @param asignaciones Array de asignaciones obtenidas de la BD
   * @param estadosMap Mapa de estados indexados por ID
   * @returns Array de meses con asignaciones
   */
  static construirMeses(
    mesInicio: number,
    anioInicio: number,
    mesFin: number,
    anioFin: number,
    asignaciones: OldAsignacion[],
    estadosMap: Map<number, OldEstado>,
    fechasConPuestoVigente?: Set<string>,
  ): MesAsignacionesDto[] {
    const meses: MesAsignacionesDto[] = [];

    // Crear mapa de asignaciones por fecha para búsqueda rápida
    const asignacionesMap = this.crearMapaAsignaciones(asignaciones);

    // Iterar por todos los meses del periodo
    let mesActual = mesInicio;
    let anioActual = anioInicio;

    while (
      anioActual < anioFin ||
      (anioActual === anioFin && mesActual <= mesFin)
    ) {
      const mesDto = this.construirMesDto(
        mesActual,
        anioActual,
        asignacionesMap,
        estadosMap,
        fechasConPuestoVigente,
      );
      meses.push(mesDto);

      // Avanzar al siguiente mes
      mesActual++;
      if (mesActual > 12) {
        mesActual = 1;
        anioActual++;
      }
    }

    return meses;
  }

  /**
   * Crea un mapa de asignaciones indexado por fecha (YYYY-MM-DD) para búsqueda eficiente
   */
  private static crearMapaAsignaciones(
    asignaciones: OldAsignacion[],
  ): Map<string, OldAsignacion> {
    const mapa = new Map<string, OldAsignacion>();
    asignaciones.forEach((asig) => {
      const fecha = new Date(asig.fecha);
      const key = `${fecha.getFullYear()}-${fecha.getMonth() + 1}-${fecha.getDate()}`;
      mapa.set(key, asig);
    });
    return mapa;
  }

  /**
   * Construye el DTO para un mes específico
   */
  private static construirMesDto(
    mesActual: number,
    anioActual: number,
    asignacionesMap: Map<string, OldAsignacion>,
    estadosMap: Map<number, OldEstado>,
    fechasConPuestoVigente?: Set<string>,
  ): MesAsignacionesDto {
    // Determinar cuántos días tiene este mes
    const diasEnMes = new Date(anioActual, mesActual, 0).getDate();

    // Crear array de 31 elementos (para todos los días posibles)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const asignacionesMes: (AsignacionDiaDto | null)[] = Array(31).fill(null);

    // Rellenar con asignaciones reales
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const key = `${anioActual}-${mesActual}-${dia}`;
      const asignacion = asignacionesMap.get(key);

      if (
        asignacion &&
        (!fechasConPuestoVigente || fechasConPuestoVigente.has(key))
      ) {
        const estado = estadosMap.get(asignacion.estado_id);
        asignacionesMes[dia - 1] = this.mapearAsignacionADto(
          dia,
          mesActual,
          anioActual,
          asignacion,
          estado,
        );
      }
    }

    return {
      mes: mesActual,
      anio: anioActual,
      mesNombre: NOMBRES_MESES[mesActual - 1],
      asignaciones: asignacionesMes,
    };
  }

  /**
   * Mapea una asignación de BD a DTO de día
   */
  private static mapearAsignacionADto(
    dia: number,
    mes: number,
    anio: number,
    asignacion: OldAsignacion,
    estado: OldEstado | undefined,
  ): AsignacionDiaDto {
    return {
      dia,
      mes,
      anio,
      estadoId: asignacion.estado_id,
      abreviatura: estado?.abreviatura || '',
      colortexto: estado?.colortexto,
      colorfondo: estado?.colorfondo,
      horainicio: asignacion.horaini || estado?.horainicio,
      horafin: asignacion.horafin || estado?.horafin,
      descripEstado: estado?.descrip,
    };
  }
}
