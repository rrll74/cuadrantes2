import React from "react";
import { IResultadoPresencia, EstadoPresencia } from "@cuadrantes/shared-dto";
import { clsx } from "clsx";

export const SummaryCards = ({ data }: { data: IResultadoPresencia[] }) => {
  const stats = {
    total: data.length,
    completo: data.filter((r) => r.estado === EstadoPresencia.COMPLETO).length,
    incompleto: data.filter((r) => r.estado === EstadoPresencia.INCOMPLETO)
      .length,
    sinPresencia: data.filter((r) => r.estado === EstadoPresencia.SIN_PRESENCIA)
      .length,
    revisar: data.filter((r) => r.revisar).length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <Card
        label="Total Rutas"
        value={stats.total}
        color="bg-gray-100 text-gray-800"
      />
      <Card
        label="Completos"
        value={stats.completo}
        color="bg-green-100 text-green-800"
      />
      <Card
        label="Incompletos"
        value={stats.incompleto}
        color="bg-yellow-100 text-yellow-800"
      />
      <Card
        label="Sin Presencia"
        value={stats.sinPresencia}
        color="bg-red-100 text-red-800"
      />
      <Card
        label="A Revisar"
        value={stats.revisar}
        color="bg-purple-100 text-purple-800"
        bold
      />
    </div>
  );
};

const Card = ({ label, value, color, bold }: any) => (
  <div
    className={clsx(
      "p-4 rounded-lg shadow-sm flex flex-col items-center justify-center border",
      color,
    )}
  >
    <span className="text-sm font-medium opacity-80">{label}</span>
    <span className={clsx("text-2xl", bold ? "font-bold" : "font-semibold")}>
      {value}
    </span>
  </div>
);
