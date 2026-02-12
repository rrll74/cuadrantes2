import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  IsEmail,
} from "class-validator";

// Constante para nombres de meses
export const NOMBRES_MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// Interfaces para DTOs de respuesta (no requieren decoradores)
export interface EmpleadoSimpleDto {
  id: number;
  nombre: string;
  nif?: string;
  email?: string;
}

export interface DepartamentoDto {
  id: number;
  nombre: string;
}

export interface CuadranteDisponibleDto {
  id: number;
  nombre: string;
  departamentoId: number;
  departamentoNombre: string;
  guardia: boolean;
}

export interface EstadoTrabajoDto {
  id: number;
  abreviatura: string;
  descrip?: string;
  trab1_desc0: boolean;
  colortexto: number;
  colorfondo: number;
  horainicio?: string;
  horafin?: string;
}

export interface AsignacionDiaDto {
  dia: number;
  mes: number;
  anio: number;
  estadoId?: number;
  abreviatura?: string;
  colortexto?: number;
  colorfondo?: number;
  horainicio?: string;
  horafin?: string;
  descripEstado?: string;
}

export interface MesAsignacionesDto {
  mes: number;
  anio: number;
  mesNombre: string;
  asignaciones: (AsignacionDiaDto | null)[]; // Array de 31 elementos (días del mes)
}

export interface ConsultaCuadranteResponseDto {
  empleado: EmpleadoSimpleDto;
  cuadrante: CuadranteDisponibleDto;
  meses: MesAsignacionesDto[];
  estadosUsados: EstadoTrabajoDto[];
  tipoInicial: boolean; // true = inicial, false = modificado
}

// Clases para DTOs de request (requieren decoradores para validación)
export class ConsultaCuadranteRequestDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  empleadoId!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  mesInicio!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(2000)
  anioInicio!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  mesFin!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(2000)
  anioFin!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  cuadranteId!: number;

  @IsBoolean()
  @IsNotEmpty()
  tipoInicial!: boolean; // true = inicial, false = modificado
}

export class CuadrantesDisponiblesRequestDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  empleadoId!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  mesInicio!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(2000)
  anioInicio!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  mesFin!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(2000)
  anioFin!: number;
}

export class GenerarPdfRequestDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  empleadoId!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  mesInicio!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(2000)
  anioInicio!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  mesFin!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(2000)
  anioFin!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  cuadranteId!: number;

  @IsBoolean()
  @IsNotEmpty()
  tipoInicial!: boolean;

  @IsBoolean()
  @IsOptional()
  enviarEmail?: boolean; // true = generar y enviar, false = solo generar
}
