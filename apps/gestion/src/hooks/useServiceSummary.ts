import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface ServiceSummaryRow {
  servicio: string;
  jornadas: number;
}

export interface ServiceSummaryResponse {
  rows: ServiceSummaryRow[];
  total: number;
  discountedRows?: ServiceSummaryRow[];
  discountedTotal?: number;
  session?: {
    daysMonFri: number;
    shiftsMonFri: number;
    daysSatSunHol: number;
    shiftsSatSunHol: number;
  };
}

export const useServiceSummary = (sessionId: number) => {
  const { data, isLoading, error } = useQuery<ServiceSummaryResponse>({
    queryKey: ["jornadas-service-summary", sessionId],
    queryFn: async () => {
      const response = await api.get(`/jornadas/${sessionId}/service-summary`);
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
