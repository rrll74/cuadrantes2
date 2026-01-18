"use client";

import React from "react";
import { INFO_JORNADAS_DIARIAS } from "@cuadrantes/shared-dto";

export interface MonthInfoData {
  isHighSeason: boolean;
  daysMonFri: number;
  shiftsMonFri: number;
  daysSatSunHol: number;
  shiftsSatSunHol: number;
  discountServices: string;
  discountTeams: string;
}

interface MonthInfoFormProps {
  value: MonthInfoData;
  onChange: (value: MonthInfoData) => void;
}

export const MonthInfoForm = ({ value, onChange }: MonthInfoFormProps) => {
  const handleSeasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isHigh = e.target.checked;
    const seasonKey = isHigh ? "ALTA" : "BAJA";
    onChange({
      ...value,
      isHighSeason: isHigh,
      shiftsMonFri: INFO_JORNADAS_DIARIAS[seasonKey].NRO_LV,
      shiftsSatSunHol: INFO_JORNADAS_DIARIAS[seasonKey].NRO_SDF,
    });
  };

  const handleChange = (
    field: keyof MonthInfoData,
    val: string | number | boolean,
  ) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Información de la Sesión (Mes)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Temporada */}
        <div className="md:col-span-2 flex items-center">
          <input
            id="isHighSeason"
            type="checkbox"
            checked={value.isHighSeason}
            onChange={handleSeasonChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="isHighSeason"
            className="ml-2 block text-sm text-gray-900 font-medium"
          >
            Temporada Alta
          </label>
        </div>

        {/* Lunes a Viernes */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Días Lunes a Viernes
            </label>
            <input
              type="number"
              min="0"
              max="31"
              value={value.daysMonFri}
              onChange={(e) =>
                handleChange("daysMonFri", parseInt(e.target.value) || 0)
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Jornadas Diarias (L-V)
            </label>
            <input
              type="number"
              step="0.01"
              value={value.shiftsMonFri}
              onChange={(e) =>
                handleChange("shiftsMonFri", parseFloat(e.target.value) || 0)
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            />
          </div>
        </div>

        {/* Sábados, Domingos y Festivos */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Días Sábados, Domingos y Festivos
            </label>
            <input
              type="number"
              min="0"
              max="31"
              value={value.daysSatSunHol}
              onChange={(e) =>
                handleChange("daysSatSunHol", parseInt(e.target.value) || 0)
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Jornadas Diarias (S-D-F)
            </label>
            <input
              type="number"
              step="0.01"
              value={value.shiftsSatSunHol}
              onChange={(e) =>
                handleChange("shiftsSatSunHol", parseFloat(e.target.value) || 0)
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            />
          </div>
        </div>

        {/* Descuentos */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Servicios a descontar (separados por comas)
            </label>
            <input
              type="text"
              value={value.discountServices}
              onChange={(e) => handleChange("discountServices", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Ej: TALLER, MANTENIMIENTO
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Equipos a descontar (separados por comas)
            </label>
            <input
              type="text"
              value={value.discountTeams}
              onChange={(e) => handleChange("discountTeams", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Ej: navidad, feria, refuerzo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
