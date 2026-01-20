import React from "react";

export interface SummaryTableColumn<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
}

interface SummaryTableProps<T> {
  title: string;
  columns: SummaryTableColumn<T>[];
  data: T[];
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  variant?: "default" | "discounted";
  className?: string;
}

export const SummaryTable = <T,>({
  title,
  columns,
  data,
  footer,
  headerActions,
  variant = "default",
  className = "",
}: SummaryTableProps<T>) => {
  const isDiscounted = variant === "discounted";
  const headerBg = isDiscounted ? "bg-red-50" : "bg-gray-50";
  const titleColor = isDiscounted ? "text-red-800" : "text-gray-700";
  const hoverColor = isDiscounted ? "hover:bg-red-50" : "hover:bg-blue-50";

  return (
    <div
      className={`w-full overflow-hidden border border-gray-200 rounded-lg shadow-sm bg-white mx-auto ${className}`}
    >
      <div
        className={`p-4 border-b border-gray-200 ${headerBg} flex justify-between items-center`}
      >
        <h3 className={`font-semibold ${titleColor}`}>{title}</h3>
        {headerActions && (
          <div className="flex items-center gap-4">{headerActions}</div>
        )}
      </div>
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`px-6 py-3 text-${
                  col.align || "left"
                } font-semibold text-gray-600 uppercase tracking-wider`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, idx) => (
            <tr key={idx} className={`${hoverColor} transition-colors`}>
              {columns.map((col, cIdx) => (
                <td
                  key={cIdx}
                  className={`px-6 py-4 whitespace-nowrap text-${
                    col.align || "left"
                  } ${
                    cIdx === 0 ? "font-medium text-gray-900" : "text-gray-700"
                  }`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-200">
            {footer}
          </tfoot>
        )}
      </table>
    </div>
  );
};
