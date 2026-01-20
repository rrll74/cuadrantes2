import { ScheduledRoute } from '../../entities/scheduled-route.entity';
import { RawWorker } from '../../entities/raw-worker.entity';
import { EstadoPresencia } from '../../entities/presence-result.entity';

export interface SessionResultItem {
  ruta: ScheduledRoute;
  trabajador: RawWorker | null;
  fichajeEntrada: Date | null;
  fichajeSalida: Date | null;
  estado: EstadoPresencia;
  esDuplicado: boolean;
  revisar: boolean;
  isDiscounted: boolean;
}

export interface PaginatedSessionResults {
  data: SessionResultItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: {
    total: number;
    completo: number;
    incompleto: number;
    sinPresencia: number;
    revisar: number;
  };
}

export interface UnmatchedResultData {
  data: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface JornadasTableColumn {
  key: string;
  label: string;
}

export interface JornadasTableRow {
  servicio: string;
  equipo: string;
  [key: string]: any;
}

export interface JornadasTableFooter {
  servicio: string;
  equipo: string;
  [key: string]: any;
}

export interface JornadasTableDetail {
  columns: JornadasTableColumn[];
  rows: JornadasTableRow[];
  footer: JornadasTableFooter;
  discountedRows: JornadasTableRow[];
  discountedFooter: JornadasTableFooter;
}

export interface ServiceSummaryRow {
  servicio: string;
  jornadas: number;
}

export interface ServiceSummaryResult {
  rows: ServiceSummaryRow[];
  discountedRows: ServiceSummaryRow[];
  total: number;
  discountedTotal: number;
  session: any;
}

export interface WorkerSummaryRow {
  puesto: string;
  equal: number;
  jornadas: number;
}

export interface WorkerSummaryResult {
  rows: WorkerSummaryRow[];
  discountedRows: WorkerSummaryRow[];
  total: number;
  discountedTotal: number;
  session: any;
}

export interface StatusSummaryRow {
  estado: EstadoPresencia;
  noPartsCount: number;
  noPartsPercent: number;
  withPartsCount: number;
  withPartsPercent: number;
}

export interface StatusSummaryFooter {
  estado: string;
  noPartsCount: number;
  noPartsPercent: number;
  withPartsCount: number;
  withPartsPercent: number;
}

export interface StatusSummaryResult {
  rows: StatusSummaryRow[];
  footer: StatusSummaryFooter;
}

export type CellColor = 'green' | 'yellow' | 'red';
