import { useState, useCallback } from "react";

export type FileKey = "titulares" | "auxiliares" | "trabajadores" | "fichajes";

export interface FileState {
  titulares: File | null;
  auxiliares: File | null;
  trabajadores: File | null;
  fichajes: File | null;
}

export const useFileUpload = () => {
  const [files, setFiles] = useState<FileState>({
    titulares: null,
    auxiliares: null,
    trabajadores: null,
    fichajes: null,
  });

  const handleFileChange = useCallback((key: FileKey, file: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
  }, []);

  const validateFiles = useCallback((): string | null => {
    const keys: FileKey[] = [
      "titulares",
      "auxiliares",
      "trabajadores",
      "fichajes",
    ];

    const missing = keys.filter((k) => !files[k]);
    if (missing.length > 0) {
      return `Faltan archivos requeridos: ${missing.join(", ")}.`;
    }

    const empty = keys.filter((k) => files[k] && files[k]!.size === 0);
    if (empty.length > 0) {
      return `Los siguientes archivos están vacíos: ${empty.join(", ")}.`;
    }

    return null;
  }, [files]);

  const resetFiles = useCallback(() => {
    setFiles({
      titulares: null,
      auxiliares: null,
      trabajadores: null,
      fichajes: null,
    });
  }, []);

  return {
    files,
    handleFileChange,
    validateFiles,
    resetFiles,
  };
};
