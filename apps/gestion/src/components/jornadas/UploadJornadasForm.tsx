"use client";
import React, { useState, useCallback } from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useDropzone, FileRejection, DropEvent } from "react-dropzone";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
// NOTA: Ajusta este import según el nombre de tu paquete en package.json
// ej: @cuadrantes/shared-dto
import type { UploadJornadasResponse } from "@cuadrantes/shared-dto";
import api from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useFileUpload, FileKey } from "@/hooks/useFileUpload";
import { ProgressBar } from "@/components/ui/ProgressBar";

const FILE_LABELS: Record<FileKey, string> = {
  titulares: "Rutas Titulares (Excel)",
  auxiliares: "Rutas Auxiliares (Excel)",
  trabajadores: "Listado Trabajadores (Excel)",
  fichajes: "Fichajes (Excel)",
};

export const UploadJornadasForm = () => {
  const queryClient = useQueryClient();
  const { files, handleFileChange, validateFiles, resetFiles } =
    useFileUpload();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], key: FileKey) => {
      if (acceptedFiles?.length > 0) {
        handleFileChange(key, acceptedFiles[0]);
        setMessage(null); // Limpiar mensajes previos al cambiar archivos
      }
    },
    [handleFileChange],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación básica
    const validationError = validateFiles();
    if (validationError) {
      setMessage({
        type: "error",
        text: validationError,
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setMessage(null);

    const formData = new FormData();
    if (files.titulares) formData.append("titulares", files.titulares);
    if (files.auxiliares) formData.append("auxiliares", files.auxiliares);
    if (files.trabajadores) formData.append("trabajadores", files.trabajadores);
    if (files.fichajes) formData.append("fichajes", files.fichajes);

    try {
      // Ajusta la URL a tu endpoint de backend
      const { data } = await api.post<UploadJornadasResponse>(
        "/jornadas/upload",
        formData,
        {
          // Forzamos a undefined para eliminar cualquier default (como application/json)
          headers: { "Content-Type": undefined },
          transformRequest: [(data) => data],
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || progressEvent.loaded;
            const percent = Math.round((progressEvent.loaded * 100) / total);
            setUploadProgress(percent);
          },
        },
      );

      if (data.success) {
        setMessage({
          type: "success",
          text: `Proceso completado. Sesión ID: ${data.sessionId}. Procesados: ${data.stats.procesados}`,
        });
        resetFiles();
        queryClient.invalidateQueries({ queryKey: ["jornadas-sessions"] });
        // Aquí podrías redirigir a la página de resultados o actualizar una tabla
      } else {
        setMessage({
          type: "error",
          text: data.message || "Error al procesar archivos.",
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      setMessage({
        type: "error",
        text:
          error.response?.data?.message || "Error de conexión con el servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Carga de Jornadas y Fichajes
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {(Object.keys(files) as FileKey[]).map((key) => (
            <SingleFileDropzone
              key={key}
              label={FILE_LABELS[key]}
              file={files[key]}
              onDrop={(f) => onDrop(f, key)}
            />
          ))}
        </div>

        {loading && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Subiendo y procesando...</span>
              <span>{uploadProgress}%</span>
            </div>
            <ProgressBar progress={uploadProgress} />
          </div>
        )}

        {message && (
          <div
            className={clsx(
              "p-4 mb-4 rounded-md text-sm font-medium",
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800",
            )}
          >
            {message.text}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={clsx(
              "px-6 py-2 rounded-md text-white font-semibold transition-colors",
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700",
            )}
          >
            {loading ? "Procesando..." : "Procesar Archivos"}
          </button>
        </div>
      </form>
    </div>
  );
};

// Subcomponente para cada zona de carga
const SingleFileDropzone = ({
  label,
  file,
  onDrop,
}: {
  label: string;
  file: File | null;
  onDrop: (files: File[]) => void;
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div
        {...getRootProps()}
        className={twMerge(
          "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors h-32",
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400",
          file ? "bg-green-50 border-green-300" : "bg-gray-50",
        )}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="text-sm text-green-700 font-medium break-all">
            <span className="text-2xl block mb-1">📄</span>
            {file.name}
          </div>
        ) : (
          <div className="text-gray-500 text-sm">
            {isDragActive ? (
              <p>Suelta el archivo aquí...</p>
            ) : (
              <p>Arrastra o haz clic para seleccionar</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
