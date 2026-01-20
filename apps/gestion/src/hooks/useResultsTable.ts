import { useState, useEffect } from "react";
import api from "@/lib/api";
import { IResultadoPresencia } from "@cuadrantes/shared-dto";
import { useDebounce } from "@/hooks/useDebounce";

export interface ResultsTableRow extends IResultadoPresencia {
  isDiscounted: boolean;
}

export interface ResultsStats {
  total: number;
  completo: number;
  incompleto: number;
  sinPresencia: number;
  revisar: number;
}

export const useResultsTable = (sessionId: number) => {
  const [data, setData] = useState<ResultsTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [stats, setStats] = useState<ResultsStats | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [discountedFilter, setDiscountedFilter] = useState<string>("");

  const debouncedFilter = useDebounce(globalFilter, 500);
  const limit = 10;

  useEffect(() => {
    setPage(1);
  }, [debouncedFilter, statusFilter, discountedFilter]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await api.get(
          `/jornadas/${sessionId}?page=${page}&limit=${limit}&search=${debouncedFilter}&status=${statusFilter}&discounted=${discountedFilter}`,
        );
        setData(response.data.data);
        setTotalPages(response.data.meta.totalPages);
        setTotalRecords(response.data.meta.total);
        setStats(response.data.stats);
      } catch (error) {
        console.error("Error fetching results:", error);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchData();
    }
  }, [sessionId, page, debouncedFilter, statusFilter, discountedFilter]);

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
    loading,
    page,
    setPage,
    totalPages,
    totalRecords,
    stats,
    globalFilter,
    setGlobalFilter,
    statusFilter,
    setStatusFilter,
    discountedFilter,
    setDiscountedFilter,
    handleExport,
  };
};
