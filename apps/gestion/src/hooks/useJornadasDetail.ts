import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { TableColumn, TableRow } from "@/components/jornadas/DetailTable";

export interface TableDetailResponse {
  columns: TableColumn[];
  rows: TableRow[];
  footer: TableRow;
  discountedRows?: TableRow[];
  discountedFooter?: TableRow;
}

export const useJornadasDetail = (sessionId: number) => {
  const { data, isLoading, error } = useQuery<TableDetailResponse>({
    queryKey: ["jornadas-detail", sessionId],
    queryFn: async () => {
      const response = await api.get(`/jornadas/${sessionId}/table-detail`);
      return response.data;
    },
  });

  const handleExport = async () => {
    try {
      const response = await api.get(`/jornadas/${sessionId}/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `jornadas_${sessionId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error exporting:", error);
    }
  };

  return {
    data,
    isLoading,
    error,
    handleExport,
  };
};
