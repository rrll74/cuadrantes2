export interface ParteTrabajo {
  fecha: string;
  numeroDocumento: string;
  tieneDocumentacion: boolean;
  solicitante: string;
  servicios: string[];
  direccion: string;
  descripcion: string;
  imagenes: string[];
  observaciones?: string;
  fechaEjecucion?: string;
}
