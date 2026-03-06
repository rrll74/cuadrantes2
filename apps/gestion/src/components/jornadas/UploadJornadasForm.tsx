"use client";
import React, { useState, useCallback } from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useDropzone, FileRejection, DropEvent } from "react-dropzone";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
// NOTA: Ajusta este import según el nombre de tu paquete en package.json
// ej: @cuadrantes/shared-dto
import {
  INFO_JORNADAS_DIARIAS,
  type UploadJornadasResponse,
  IMPORT_TYPES,
} from "@cuadrantes/shared-dto";
import api from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import {
  useFileUpload,
  FileKey,
  FileStateType1,
  FileStateType2,
} from "@/hooks/useFileUpload";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MonthInfoForm, MonthInfoData } from "./MonthInfoForm";

const FILE_LABELS_TYPE1: Record<string, string> = {
  titulares: "Rutas Titulares (Excel)",
  auxiliares: "Rutas Auxiliares (Excel)",
  trabajadores: "Listado Trabajadores (Excel)",
  fichajes: "Fichajes (Excel)",
};

const FILE_LABELS_TYPE2: Record<string, string> = {
  trabajadores: "Listado Trabajadores (Excel)",
  fichajes: "Fichajes (Excel)",
  rutas: "Rutas (Excel)",
  rutasDocumento: "Rutas con documento (Txt) - Opcional",
};

export const UploadJornadasForm = () => {
  const queryClient = useQueryClient();
  const [importType, setImportType] = useState<number>(IMPORT_TYPES.SECONDARY);
  const { files, handleFileChange, validateFiles, resetFiles } =
    useFileUpload(importType);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [monthInfo, setMonthInfo] = useState<MonthInfoData>({
    isHighSeason: true,
    daysMonFri: 20,
    shiftsMonFri: INFO_JORNADAS_DIARIAS.ALTA.NRO_LV,
    daysSatSunHol: 8,
    shiftsSatSunHol: INFO_JORNADAS_DIARIAS.ALTA.NRO_SDF,
    discountServices: INFO_JORNADAS_DIARIAS.SERVICIOS_DESCUENTO.join(", "),
    discountTeams: INFO_JORNADAS_DIARIAS.EQUIPOS_DESCUENTO.join(", "),
  });

  const onDrop = useCallback(
    (acceptedFiles: File[], key: FileKey) => {
      if (acceptedFiles?.length > 0) {
        handleFileChange(key, acceptedFiles[0]);
        setMessage(null); // Limpiar mensajes previos al cambiar archivos
      }
    },
    [handleFileChange],
  );

  const handleImportTypeChange = (newType: number) => {
    setImportType(newType);
    resetFiles();
    setMessage(null);
  };

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

    if (importType === IMPORT_TYPES.PRIMARY) {
      // Tipo 1: Titulares, Auxiliares, Trabajadores, Fichajes
      const type1Files: FileStateType1 = files as FileStateType1;
      if (type1Files.titulares)
        formData.append("titulares", type1Files.titulares);
      if (type1Files.auxiliares)
        formData.append("auxiliares", type1Files.auxiliares);
      if (type1Files.trabajadores)
        formData.append("trabajadores", type1Files.trabajadores);
      if (type1Files.fichajes) formData.append("fichajes", type1Files.fichajes);
    } else if (importType === IMPORT_TYPES.SECONDARY) {
      // Tipo 2: Trabajadores, Fichajes, Rutas, Rutas con Documento (opcional)
      const type2Files: FileStateType2 = files as FileStateType2;
      if (type2Files.trabajadores)
        formData.append("trabajadores", type2Files.trabajadores);
      if (type2Files.fichajes) formData.append("fichajes", type2Files.fichajes);
      if (type2Files.rutas) formData.append("rutas", type2Files.rutas);
      if (type2Files.rutasDocumento)
        formData.append("rutasDocumento", type2Files.rutasDocumento);
    }

    formData.append("monthInfo", JSON.stringify(monthInfo));
    formData.append("importType", String(importType));

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

  const fileLabels =
    importType === IMPORT_TYPES.PRIMARY ? FILE_LABELS_TYPE1 : FILE_LABELS_TYPE2;
  const fileKeys = Object.keys(fileLabels);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Carga de Jornadas y Fichajes
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Selector de Tipo de Importación */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Tipo de Importación
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importType"
                value={IMPORT_TYPES.PRIMARY}
                checked={importType === IMPORT_TYPES.PRIMARY}
                onChange={(e) => handleImportTypeChange(Number(e.target.value))}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">
                Tipo 1: Formato Original (Titulares + Auxiliares)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importType"
                value={IMPORT_TYPES.SECONDARY}
                checked={importType === IMPORT_TYPES.SECONDARY}
                onChange={(e) => handleImportTypeChange(Number(e.target.value))}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">
                Tipo 2: Formato Secundario (Rutas Unificadas)
              </span>
            </label>
          </div>
        </div>

        <MonthInfoForm value={monthInfo} onChange={setMonthInfo} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {fileKeys.map((key) => (
            <SingleFileDropzone
              key={key}
              label={fileLabels[key]}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              file={(files as any)[key] || null}
              onDrop={(f) => onDrop(f, key as FileKey)}
              acceptText={key === "rutasDocumento" ? "(Txt, Csv)" : "(Excel)"}
              isTextFile={key === "rutasDocumento"}
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

        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              resetFiles();
              setMessage(null);
            }}
            className={clsx(
              "px-6 py-2 rounded-md font-semibold transition-colors",
              loading
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-gray-300 text-gray-700 hover:bg-gray-400",
            )}
          >
            Limpiar
          </button>
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
  acceptText = "(Excel)",
  isTextFile = false,
}: {
  label: string;
  file: File | null;
  onDrop: (files: File[]) => void;
  acceptText?: string;
  isTextFile?: boolean;
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: isTextFile
      ? {
          "text/plain": [".txt"],
          "text/csv": [".csv"],
        }
      : {
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
            ".xlsx",
          ],
          "application/vnd.ms-excel": [".xls"],
        },
    maxFiles: 1,
  });

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">
        {label} <span className="text-xs text-gray-500">{acceptText}</span>
      </label>
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
