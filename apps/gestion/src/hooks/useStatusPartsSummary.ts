import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface StatusPartsSummaryRow {
  estado: string;
  noPartsCount: number;
  noPartsPercent: number;
  withPartsCount: number;
  withPartsPercent: number;
}

export interface StatusPartsSummaryResponse {
  rows: StatusPartsSummaryRow[];
  footer: StatusPartsSummaryRow;
}

export const useStatusPartsSummary = (sessionId: number) => {
  const { data, isLoading, error } = useQuery<StatusPartsSummaryResponse>({
    queryKey: ["jornadas-status-parts-summary", sessionId],
    queryFn: async () => {
      const response = await api.get(
        `/jornadas/${sessionId}/status-parts-summary`,
      );
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

  return { data, isLoading, error, handleExport };
};
