import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  addHours,
  subHours,
  isWithinInterval,
  differenceInMinutes,
} from 'date-fns';
import { CONFIG_JORNADAS } from '@cuadrantes/shared-dto';
import { ImportSession } from '../entities/import-session.entity';
import { ScheduledRoute } from '../entities/scheduled-route.entity';
import { RawClockIn, TipoFichaje } from '../entities/raw-clock-in.entity';
import {
  PresenceResult,
  EstadoPresencia,
} from '../entities/presence-result.entity';

@Injectable()
export class JornadasMatchingService {
  constructor(
    @InjectRepository(PresenceResult, 'new')
    private resultRepo: Repository<PresenceResult>,
  ) {}

  match(
    session: ImportSession,
    routes: ScheduledRoute[],
    clockIns: RawClockIn[],
  ): PresenceResult[] {
    // Agrupar fichajes por trabajador para búsqueda rápida
    const fichajesMap = new Map<number, RawClockIn[]>();
    clockIns.forEach((f) => {
      if (!fichajesMap.has(f.workerId)) {
        fichajesMap.set(f.workerId, []);
      }
      fichajesMap.get(f.workerId)?.push(f);
    });

    const results: PresenceResult[] = [];

    for (const route of routes) {
      const fichajesTrabajador = fichajesMap.get(route.workerId) || [];

      const { entrada, salida } = this.buscarCoincidenciaFichaje(
        route.inicio,
        route.fin,
        fichajesTrabajador,
      );

      const estado = this.calcularEstado(entrada, salida);

      const result = this.resultRepo.create({
        session,
        route,
        fichajeEntrada: entrada ? entrada.timestamp : null,
        fichajeSalida: salida ? salida.timestamp : null,
        estado,
        esDuplicado: false,
        revisar: estado === EstadoPresencia.INCOMPLETO,
      });
      results.push(result);
    }

    // Post-procesamiento
    this.ajustarHorarios(results);
    this.detectarDuplicados(results);

    return results;
  }

  private buscarCoincidenciaFichaje(
    inicioPlanificado: Date,
    finPlanificado: Date,
    fichajes: RawClockIn[],
  ): { entrada: RawClockIn | null; salida: RawClockIn | null } {
    const tolerancia = CONFIG_JORNADAS.TOLERANCIA_HORAS || 2;

    const ventanaEntradaInicio = subHours(inicioPlanificado, tolerancia);
    const ventanaEntradaFin = addHours(inicioPlanificado, tolerancia);
    const ventanaSalidaInicio = subHours(finPlanificado, tolerancia);
    const ventanaSalidaFin = addHours(finPlanificado, tolerancia);

    let entrada = fichajes.find(
      (f) =>
        f.tipo === TipoFichaje.ENTRADA &&
        isWithinInterval(f.timestamp, {
          start: ventanaEntradaInicio,
          end: ventanaEntradaFin,
        }),
    );

    let salida = fichajes.find(
      (f) =>
        f.tipo === TipoFichaje.SALIDA &&
        isWithinInterval(f.timestamp, {
          start: ventanaSalidaInicio,
          end: ventanaSalidaFin,
        }),
    );

    if (!entrada) {
      const posibles = fichajes.filter(
        (f) =>
          Math.abs(differenceInMinutes(f.timestamp, inicioPlanificado)) <
          tolerancia * 60,
      );
      posibles.sort(
        (a, b) =>
          Math.abs(differenceInMinutes(a.timestamp, inicioPlanificado)) -
          Math.abs(differenceInMinutes(b.timestamp, inicioPlanificado)),
      );
      if (posibles.length > 0) entrada = posibles[0];
    }

    if (!salida) {
      const posibles = fichajes.filter(
        (f) =>
          Math.abs(differenceInMinutes(f.timestamp, finPlanificado)) <
            tolerancia * 60 &&
          (entrada ? f.timestamp > entrada.timestamp : true),
      );
      posibles.sort(
        (a, b) =>
          Math.abs(differenceInMinutes(a.timestamp, finPlanificado)) -
          Math.abs(differenceInMinutes(b.timestamp, finPlanificado)),
      );
      if (posibles.length > 0) salida = posibles[0];
    }

    return { entrada: entrada || null, salida: salida || null };
  }

  private calcularEstado(
    entrada: RawClockIn | Date | null,
    salida: RawClockIn | Date | null,
  ): EstadoPresencia {
    if (entrada && salida) return EstadoPresencia.COMPLETO;
    if (entrada || salida) return EstadoPresencia.INCOMPLETO;
    return EstadoPresencia.SIN_PRESENCIA;
  }

  private ajustarHorarios(results: PresenceResult[]) {
    const groups = new Map<string, PresenceResult[]>();
    results.forEach((r) => {
      const key = `${r.route.workerId}-${r.route.fechaGeneral.getTime()}-${r.route.equipo}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(r);
    });

    for (const group of groups.values()) {
      if (group.length <= 1) continue;
      group.sort((a, b) => a.route.inicio.getTime() - b.route.inicio.getTime());

      const first = group[0];
      const last = group[group.length - 1];

      if (first.fichajeEntrada) {
        first.fichajeSalida = first.route.fin;
        first.estado = this.calcularEstado(
          first.fichajeEntrada,
          first.fichajeSalida,
        );
      }
      if (last.fichajeSalida) {
        last.fichajeEntrada = last.route.inicio;
        last.estado = this.calcularEstado(
          last.fichajeEntrada,
          last.fichajeSalida,
        );
      }
      for (let i = 1; i < group.length - 1; i++) {
        group[i].fichajeEntrada = group[i].route.inicio;
        group[i].fichajeSalida = group[i].route.fin;
        group[i].estado = EstadoPresencia.COMPLETO;
      }
    }
  }

  private detectarDuplicados(results: PresenceResult[]) {
    const groups = new Map<string, PresenceResult[]>();
    results.forEach((r) => {
      const key = `${r.route.workerId}-${r.route.fechaGeneral.getTime()}-${r.route.turno}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(r);
    });

    for (const group of groups.values()) {
      if (group.length <= 1) continue;
      group.forEach((r) => (r.esDuplicado = true));

      const partesAsociadosCero = group.filter(
        (r) => r.route.partesAsociados === 0,
      ).length;
      const equiposUnicos = new Set(group.map((r) => r.route.equipo)).size;

      let revisar = true;
      if (group.length === 2 && partesAsociadosCero > 0) revisar = false;
      else if (equiposUnicos === 1) revisar = false;
      else if (equiposUnicos === 2 && partesAsociadosCero > 0) revisar = false;

      if (revisar) group.forEach((r) => (r.revisar = true));
    }
  }
}
