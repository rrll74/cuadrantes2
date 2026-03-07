export const EXCEL_COLUMNS = {
  // Tipo 1: Formato Original
  TRABAJADOR: {
    ID: "Código",
    NOMBRE: "Nombre",
    APELLIDO1: "Apellido 1",
    APELLIDO2: "Apellido 2",
    PUESTO: "Puesto Incorpora",
    EQUAL: "Equal",
  },
  RUTATITULAR: {
    FECHA: "Fecha",
    SERVICIO: "Servicio",
    EQUIPO: "Equipo",
    TURNO: "Turno",
    INICIO: "Hora salida",
    FIN: "Hora llegada",
    VEHICULO: "Vehículo",
    KMS: "Total KM",
    PARTES_ASOCIADOS: "Nº dctos",
    TRABAJADOR: "Titular",
    HOJARUTA: "Código",
  },
  RUTAAUXILIAR: {
    FECHA: "Fecha",
    TRABAJADOR: "Trabajador",
    HOJARUTA: "Hoja de ruta",
  },
  FICHAJE: {
    ID_TRABAJADOR: "Cód. trabajador",
    FECHA_HORA: "Fecha / hora",
    EVENTO: "Tipo de dato", // 1 - Entrada/ 2 - Salida
  },
  // Tipo 2: Formato Secundario
  TRABAJADOR_TIPO2: {
    TRABAJADOR_COMBINED: "Trabajador", // Contiene: [id] - [Apellido1 Apellido2], [Nombre] ([Puesto]) ([id])
    FECHA_INICIO: "Fecha inicio",
  },
  RUTA_TIPO2: {
    FECHA: "Fecha",
    SERVICIO: "Servicio",
    EQUIPO: "Equipo",
    TURNO: "Turno",
    INICIO: "Inicio",
    FIN: "Final",
    TRABAJADOR: "Trab.",
    HOJARUTA: "Hoja ruta",
    AUXILIAR1: "Auxiliar 1",
    AUXILIAR2: "Auxiliar 2",
    // PARTES_ASOCIADOS: "Nro dctos",
  },
  FICHAJE_TIPO2: {
    ID_TRABAJADOR: "Trabajador",
    FECHA_HORA: "Fecha / hora",
    EVENTO: "Tipo dato", // 1 - Entrada/ 2 - Salida
  },
};

export const CONFIG_JORNADAS = {
  TOLERANCIA_HORAS: 2, // Horas de margen para buscar fichajes
  TOLERANCIA_CONTINUIDAD_MINUTOS: 15, // Minutos de tolerancia de continuidad entre rutas de trabajador,
};

/**
 * Tipos de importación de jornadas
 */
export const IMPORT_TYPES = {
  PRIMARY: 1,
  SECONDARY: 2,
} as const;

export type ImportType = (typeof IMPORT_TYPES)[keyof typeof IMPORT_TYPES];

/**
 * Extensiones válidas para documentos en archivo TXT de "Rutas con documento"
 */
export const VALID_DOCUMENT_EXTENSIONS = ["pdf", "webp"];

/**
 * Patrón de línea esperada en archivo "Rutas con documento (Txt)"
 * Formato: "Carpeta/Hoja _ {numero}.{extension}"
 * Ejemplo: "Carpeta/Hoja _ 123.pdf"
 */
export const ROUTE_DOCUMENT_PATTERN = /^(.*)Hoja\s_\s+(\d+)\.(pdf|webp)$/i;

/**
 * Información sobre el número de jornadas diarias que se deben realizar por parte de la empresa.
 * Se asume que cada jornada de trabajo es de 7 horas.
 */
export const INFO_JORNADAS_DIARIAS = {
  ALTA: {
    NRO_LV: 75.44,
    NRO_SDF: 43.59,
  },
  BAJA: {
    NRO_LV: 59.47,
    NRO_SDF: 26.01,
  },
  SERVICIOS_DESCUENTO: ["TALLER"], // Servicios en los que se descuentan las jornadas para cómputo
  EQUIPOS_DESCUENTO: [
    "navidad",
    "nuevo",
    "cabalgata",
    "reyes",
    "semana",
    "santa",
    "feria",
    "arroyo",
    "pueblo",
    "virgen",
    "carmen",
  ], // Palabras clave que contienen los equipos en los que se descuentan las jornadas para cómputo
};
