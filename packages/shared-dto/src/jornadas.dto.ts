import type { IResultadoPresencia } from "./types";

// Respuesta del endpoint de subida de ficheros
export interface UploadJornadasResponse {
  success: boolean;
  message: string;
  sessionId: number; // ID de la sesión de carga creada en BD
  stats: {
    totalRutas: number;
    procesados: number;
    conflictos: number;
  };
  data: IResultadoPresencia[]; // Opcional: devolver los datos procesados inmediatamente
}

// Query Params para la exportación
export interface ExportJornadasQuery {
  sessionId: number;
  format: "pdf" | "xlsx" | "ods";
  includeDetails?: boolean;
}
