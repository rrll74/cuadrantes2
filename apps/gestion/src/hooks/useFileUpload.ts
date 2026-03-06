import { useState, useCallback } from "react";

export type FileKeyType1 =
  | "titulares"
  | "auxiliares"
  | "trabajadores"
  | "fichajes";
export type FileKeyType2 =
  | "trabajadores"
  | "fichajes"
  | "rutas"
  | "rutasDocumento";
export type FileKey = FileKeyType1 | FileKeyType2;

export interface FileStateType1 {
  titulares: File | null;
  auxiliares: File | null;
  trabajadores: File | null;
  fichajes: File | null;
}

export interface FileStateType2 {
  trabajadores: File | null;
  fichajes: File | null;
  rutas: File | null;
  rutasDocumento: File | null;
}

export type FileState = FileStateType1 | FileStateType2;

export const useFileUpload = (importType: number = 1) => {
  const [files, setFiles] = useState<FileState>(
    importType === 1
      ? {
          titulares: null,
          auxiliares: null,
          trabajadores: null,
          fichajes: null,
        }
      : {
          trabajadores: null,
          fichajes: null,
          rutas: null,
          rutasDocumento: null,
        },
  );

  const handleFileChange = useCallback((key: FileKey, file: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
  }, []);

  const validateFiles = useCallback((): string | null => {
    if (importType === 1) {
      const state = files as FileStateType1;
      const keys: FileKeyType1[] = [
        "titulares",
        "auxiliares",
        "trabajadores",
        "fichajes",
      ];

      const missing = keys.filter((k) => !state[k]);
      if (missing.length > 0) {
        return `Faltan archivos requeridos: ${missing.join(", ")}.`;
      }

      const empty = keys.filter((k) => state[k] && state[k]!.size === 0);
      if (empty.length > 0) {
        return `Los siguientes archivos están vacíos: ${empty.join(", ")}.`;
      }
    } else if (importType === 2) {
      const state = files as FileStateType2;
      const requiredKeys: FileKeyType2[] = [
        "trabajadores",
        "fichajes",
        "rutas",
      ];

      const missing = requiredKeys.filter((k) => !state[k]);
      if (missing.length > 0) {
        return `Faltan archivos requeridos: ${missing.join(", ")}.`;
      }

      const empty = requiredKeys.filter(
        (k) => state[k] && state[k]!.size === 0,
      );
      if (empty.length > 0) {
        return `Los siguientes archivos están vacíos: ${empty.join(", ")}.`;
      }
    }

    return null;
  }, [files, importType]);

  const resetFiles = useCallback(() => {
    if (importType === 1) {
      setFiles({
        titulares: null,
        auxiliares: null,
        trabajadores: null,
        fichajes: null,
      });
    } else if (importType === 2) {
      setFiles({
        trabajadores: null,
        fichajes: null,
        rutas: null,
        rutasDocumento: null,
      });
    }
  }, [importType]);

  return {
    files,
    handleFileChange,
    validateFiles,
    resetFiles,
  };
};
