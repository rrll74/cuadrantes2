import React from "react";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import { EstadoPresencia } from "@cuadrantes/shared-dto";
import { clsx } from "clsx";
import { ResultsTableRow } from "@/hooks/useResultsTable";

const columnHelper = createColumnHelper<ResultsTableRow>();

export const columns = [
  columnHelper.accessor("ruta.fechaGeneral", {
    header: "Fecha",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
  columnHelper.accessor("ruta.servicio", {
    header: "Servicio",
  }),
  columnHelper.accessor("ruta.equipo", {
    header: "Equipo",
  }),
  columnHelper.accessor(
    (row) => {
      const w = row.trabajador;
      return w
        ? `${w.nombre} ${w.apellido1} ${w.apellido2 || ""}`.trim()
        : "Sin asignar";
    },
    {
      id: "trabajador",
      header: "Trabajador",
      cell: (info) => {
        const val = info.getValue();
        return val === "Sin asignar" ? (
          <span className="text-gray-400 italic">{val}</span>
        ) : (
          val
        );
      },
    },
  ),
  columnHelper.accessor("ruta.inicio", {
    header: "Inicio Plan.",
    cell: (info) =>
      new Date(info.getValue()).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
  }),
  columnHelper.accessor("ruta.fin", {
    header: "Fin Plan.",
    cell: (info) =>
      new Date(info.getValue()).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
  }),
  columnHelper.accessor("fichajeEntrada", {
    header: "Entrada Real",
    cell: (info) => {
      const val = info.getValue();
      return val
        ? new Date(val).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";
    },
  }),
  columnHelper.accessor("fichajeSalida", {
    header: "Salida Real",
    cell: (info) => {
      const val = info.getValue();
      return val
        ? new Date(val).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";
    },
  }),
  columnHelper.accessor("estado", {
    header: "Estado",
    cell: (info) => (
      <span
        className={clsx(
          "px-2 py-1 rounded text-xs font-semibold",
          info.getValue() === EstadoPresencia.COMPLETO
            ? "bg-green-100 text-green-800"
            : info.getValue() === EstadoPresencia.INCOMPLETO
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800",
        )}
      >
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("isDiscounted", {
    header: "Descontado",
    cell: (info) => (
      <span
        className={clsx(
          "px-2 py-1 rounded text-xs font-semibold",
          info.getValue() ? "bg-orange-100 text-orange-800" : "text-gray-400",
        )}
      >
        {info.getValue() ? "Sí" : "No"}
      </span>
    ),
  }),
] as ColumnDef<ResultsTableRow, unknown>[];
