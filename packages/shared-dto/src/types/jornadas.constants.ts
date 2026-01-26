export const EXCEL_COLUMNS = {
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
};

export const CONFIG_JORNADAS = {
  TOLERANCIA_HORAS: 2, // Horas de margen para buscar fichajes
  TOLERANCIA_CONTINUIDAD_MINUTOS: 15, // Minutos de tolerancia de continuidad entre rutas de trabajador,
};

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
