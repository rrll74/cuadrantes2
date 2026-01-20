import React from "react";

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableRow {
  servicio: string;
  equipo: string;
  total_value: number;
  total_color?: "green" | "yellow" | "red";
  [key: string]: string | number | ("green" | "yellow" | "red") | undefined;
}

interface DetailTableProps {
  columns: TableColumn[];
  rows: TableRow[];
  footer: TableRow;
  title: string;
  isDiscounted?: boolean;
  onExport?: () => void;
}

const getColorClasses = (
  color?: "green" | "yellow" | "red",
): { bg: string; text: string } => {
  switch (color) {
    case "green":
      return { bg: "bg-green-50", text: "text-green-900" };
    case "yellow":
      return { bg: "bg-yellow-50", text: "text-yellow-900" };
    case "red":
      return { bg: "bg-red-50", text: "text-red-900" };
    default:
      return { bg: "bg-white", text: "text-gray-700" };
  }
};

export const DetailTable = ({
  columns,
  rows,
  footer,
  title,
  isDiscounted = false,
  onExport,
}: DetailTableProps) => {
  return (
    <div className="w-full overflow-hidden border border-gray-200 rounded-lg shadow-sm bg-white mb-8">
      <div
        className={`p-4 border-b border-gray-200 flex justify-between items-center ${
          isDiscounted ? "bg-red-50" : "bg-gray-50"
        }`}
      >
        <h3
          className={`font-semibold ${
            isDiscounted ? "text-red-800" : "text-gray-700"
          }`}
        >
          {title}
        </h3>
        {!isDiscounted && (
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-4 text-xs mr-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-200 rounded"></div>
                <span className="text-gray-600">Completo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-200 rounded"></div>
                <span className="text-gray-600">Incompleto</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-200 rounded"></div>
                <span className="text-gray-600">Sin Presencia</span>
              </div>
            </div>
            {onExport && (
              <button
                onClick={onExport}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Exportar Excel
              </button>
            )}
          </div>
        )}
      </div>
      <div className="overflow-x-auto max-h-[75vh]">
        <table className="min-w-full divide-y divide-gray-200 text-sm border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider border-b border-r bg-gray-50 sticky left-0 z-30 w-40 min-w-[10rem]">
                Servicio
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider border-b border-r bg-gray-50 sticky left-40 z-30 w-32 min-w-[8rem]">
                Equipo
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-2 py-3 text-center font-medium text-gray-500 border-b min-w-[60px]"
                >
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase tracking-wider border-b border-l bg-gray-100 min-w-[80px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, idx) => (
              <tr
                key={`${row.servicio}-${row.equipo}-${idx}`}
                className={
                  isDiscounted
                    ? "hover:bg-red-50 transition-colors"
                    : "hover:bg-blue-50 transition-colors"
                }
              >
                <td
                  className="px-4 py-2 whitespace-nowrap font-medium text-gray-900 border-r bg-white sticky left-0 z-10 w-40 truncate"
                  title={row.servicio}
                >
                  {row.servicio}
                </td>
                <td
                  className="px-4 py-2 whitespace-nowrap text-gray-600 border-r bg-white sticky left-40 z-10 w-32 truncate"
                  title={row.equipo}
                >
                  {row.equipo}
                </td>
                {columns.map((col) => {
                  const colorClass = getColorClasses(
                    row[`${col.key}_color`] as
                      | "green"
                      | "yellow"
                      | "red"
                      | undefined,
                  );
                  return (
                    <td
                      key={col.key}
                      className={`px-2 py-2 text-center font-medium ${colorClass.bg} ${colorClass.text}`}
                    >
                      {row[`${col.key}_value`] !== undefined
                        ? row[`${col.key}_value`]
                        : "-"}
                    </td>
                  );
                })}
                <td
                  className={`px-4 py-2 text-center font-bold border-l ${
                    getColorClasses(row.total_color).bg
                  } ${getColorClasses(row.total_color).text}`}
                >
                  {row.total_value}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 font-bold sticky bottom-0 z-20 shadow-inner">
            <tr>
              <td
                className="px-4 py-3 text-right text-gray-800 border-t border-r bg-gray-100 sticky left-0 z-30"
                colSpan={2}
              >
                {footer.servicio || "TOTALES"}
              </td>
              {columns.map((col) => {
                const colorClass = getColorClasses(
                  footer[`${col.key}_color`] as
                    | "green"
                    | "yellow"
                    | "red"
                    | undefined,
                );
                return (
                  <td
                    key={col.key}
                    className={`px-2 py-3 text-center text-gray-900 border-t font-bold ${colorClass.bg} ${colorClass.text}`}
                  >
                    {footer[`${col.key}_value`] !== undefined
                      ? footer[`${col.key}_value`]
                      : "-"}
                  </td>
                );
              })}
              <td
                className={`px-4 py-3 text-center text-gray-900 border-t border-l font-bold ${
                  getColorClasses(footer.total_color).bg
                } ${getColorClasses(footer.total_color).text}`}
              >
                {footer.total_value}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
