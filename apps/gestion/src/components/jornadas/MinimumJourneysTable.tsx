import React from "react";

interface MinimumJourneysTableProps {
  session: {
    daysMonFri: number;
    shiftsMonFri: number;
    daysSatSunHol: number;
    shiftsSatSunHol: number;
  };
  totalRealized: number;
  className?: string;
}

export const MinimumJourneysTable = ({
  session,
  totalRealized,
  className = "",
}: MinimumJourneysTableProps) => {
  const minJornadas =
    Number(session.daysMonFri) * Number(session.shiftsMonFri) +
    Number(session.daysSatSunHol) * Number(session.shiftsSatSunHol);

  const diff = totalRealized - minJornadas;

  return (
    <div
      className={`w-full overflow-hidden border border-gray-200 rounded-lg shadow-sm bg-white mx-auto ${className}`}
    >
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-700">
          Cálculo de Jornadas Mínimas (Cumplimiento)
        </h3>
      </div>
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <tbody className="bg-white divide-y divide-gray-200">
          <tr>
            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
              Lunes a Viernes
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700">
              {session.daysMonFri} días x {session.shiftsMonFri} jornadas
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700 font-mono">
              {(
                Number(session.daysMonFri) * Number(session.shiftsMonFri)
              ).toFixed(2)}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
              Sábados, Domingos y Festivos
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700">
              {session.daysSatSunHol} días x {session.shiftsSatSunHol} jornadas
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700 font-mono">
              {(
                Number(session.daysSatSunHol) * Number(session.shiftsSatSunHol)
              ).toFixed(2)}
            </td>
          </tr>
        </tbody>
        <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-200">
          <tr>
            <td className="px-6 py-4 text-gray-900 uppercase" colSpan={2}>
              TOTAL JORNADAS MÍNIMAS
            </td>
            <td className="px-6 py-4 text-right text-gray-900 font-mono text-base">
              {minJornadas.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 text-gray-900 uppercase" colSpan={2}>
              DIFERENCIA (REALIZADO - MÍNIMO)
            </td>
            <td
              className={`px-6 py-4 text-right font-mono text-base ${
                diff >= 0 ? "text-blue-600" : "text-red-600"
              }`}
            >
              {diff.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
