// packages/shared/src/types/jornadas.ts

export enum TipoFichaje {
  ENTRADA = "Entrada",
  SALIDA = "Salida",
}

export enum EstadoPresencia {
  COMPLETO = "completo",
  INCOMPLETO = "incompleto",
  SIN_PRESENCIA = "sin presencia",
}

export interface ITrabajador {
  id: number;
  excelId: number;
  nombre: string;
  apellido1: string;
  apellido2: string;
  puesto: string;
  equal: number;
}

export interface IFichaje {
  workerId: number;
  timestamp: Date;
  tipo: TipoFichaje;
}

export interface IRutaPlanificada {
  fechaGeneral: Date;
  codigoParte: string;
  servicio: string;
  turno: string;
  equipo: string;
  inicio: Date;
  fin: Date;
  workerId: number;
  vehiculo: string;
  kms: number;
  partesAsociados: number;
}

// El resultado procesado que el Front recibirá
export interface IResultadoPresencia {
  ruta: IRutaPlanificada;
  trabajador: ITrabajador | null;
  fichajeEntrada: Date | null;
  fichajeSalida: Date | null;
  estado: EstadoPresencia;
  esDuplicado: boolean;
  revisar: boolean;
}

export interface IResultadoSinRuta {
  id: number;
  fecha: Date;
  fichajeEntrada: Date | null;
  fichajeSalida: Date | null;
  estado: EstadoPresencia;
  trabajador: ITrabajador | null;
  workerId: number;
}

export interface TableDetailRowDto {
  id: string;
  data: (string | number)[];
}

export interface TableDetailResponseDto {
  columns: TableDetailRowDto[];
  rows: TableDetailRowDto[];
  footer: TableDetailRowDto;
  discountedRows?: TableDetailRowDto[];
  discountedFooter?: TableDetailRowDto;
}
