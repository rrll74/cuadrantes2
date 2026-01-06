export const EXCEL_COLUMNS = {
  TRABAJADOR: {
    ID: "Id trabajador",
    NOMBRE: "Nombre",
    APELLIDO1: "Apellido 1",
    APELLIDO2: "Apellido 2",
    PUESTO: "Puesto",
    EQUAL: "Equal",
  },
  RUTA: {
    FECHA: "Fecha general",
    SERVICIO: "Servicio",
    TURNO: "Turno",
    INICIO: "Inicio",
    FIN: "Fin",
  },
  FICHAJE: {
    ID_TRABAJADOR: "Id trabajador",
    FECHA_HORA: "Fecha hora",
    EVENTO: "Evento", // Entrada/Salida
  },
};

export const CONFIG_JORNADAS = {
  TOLERANCIA_HORAS: 2, // Horas de margen para buscar fichajes
};
