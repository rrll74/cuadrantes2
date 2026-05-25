import { useCallback, useMemo, useState } from "react";
import { distribuirPresupuesto } from "../lib/algoritmo";
import { exportDistributionToExcel } from "../lib/export-excel";
import { exportDistributionToPdf } from "../lib/export-pdf";
import { parseMaterialsWorkbook } from "../lib/parser";
import type {
  DistributionResult,
  MaterialInputRow,
  MaterialValidationError,
  ParsedMaterialsResult,
} from "../lib/types";

const normalizeBudget = (value: string) =>
  value.trim().replace(/\s+/g, "").replace(",", ".");

export const useDistribucionPresupuesto = () => {
  const [file, setFile] = useState<File | null>(null);
  const [budgetTotal, setBudgetTotal] = useState("");
  const [materials, setMaterials] = useState<MaterialInputRow[]>([]);
  const [errors, setErrors] = useState<MaterialValidationError[]>([]);
  const [resultInfo, setResultInfo] = useState<string | null>(null);
  const [distributionResult, setDistributionResult] =
    useState<DistributionResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const parsedBudget = useMemo(() => {
    const normalized = normalizeBudget(budgetTotal);
    if (!normalized) {
      return Number.NaN;
    }

    return Number(normalized);
  }, [budgetTotal]);

  const handleFileChange = useCallback((newFile: File | null) => {
    setFile(newFile);
    setErrors([]);
    setResultInfo(null);
    setMaterials([]);
    setDistributionResult(null);
  }, []);

  const handleBudgetChange = useCallback((value: string) => {
    setBudgetTotal(value);
    setResultInfo(null);
    setDistributionResult(null);
  }, []);

  const validateBudget = useCallback(() => {
    if (!budgetTotal.trim()) {
      return "El presupuesto objetivo es obligatorio.";
    }

    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      return "El presupuesto objetivo debe ser un número mayor que 0.";
    }

    return null;
  }, [budgetTotal, parsedBudget]);

  const parseFile = useCallback(async () => {
    if (!file) {
      setErrors([
        {
          field: "file",
          message: "Debes seleccionar un fichero Excel.",
        },
      ]);
      setMaterials([]);
      setResultInfo(null);
      return null;
    }

    const budgetError = validateBudget();
    if (budgetError) {
      setErrors([
        {
          field: "presupuesto_total",
          message: budgetError,
        },
      ]);
      setMaterials([]);
      setResultInfo(null);
      return null;
    }

    setIsParsing(true);
    try {
      const parsed: ParsedMaterialsResult = await parseMaterialsWorkbook(file);
      setErrors(parsed.errors);
      setMaterials(parsed.materials);
      setDistributionResult(null);

      if (parsed.errors.length === 0) {
        setResultInfo(
          `Excel válido en la hoja ${parsed.sheetName}. Materiales cargados: ${parsed.materials.length}.`,
        );
      } else {
        setResultInfo(null);
      }

      return parsed;
    } finally {
      setIsParsing(false);
    }
  }, [file, validateBudget]);

  const calculateDistribution = useCallback(async () => {
    const parsed = await parseFile();

    if (!parsed || parsed.errors.length > 0) {
      return null;
    }

    const distribution = distribuirPresupuesto(parsed.materials, parsedBudget);
    setDistributionResult(distribution);
    setResultInfo(
      `Distribución calculada correctamente. Total: ${distribution.summary.subtotalCalculado.toFixed(2)} €`,
    );

    return distribution;
  }, [parseFile, parsedBudget]);

  const handleExportExcel = useCallback(() => {
    if (!distributionResult) {
      return;
    }

    setIsExporting(true);
    try {
      exportDistributionToExcel(distributionResult);
    } finally {
      setIsExporting(false);
    }
  }, [distributionResult]);

  const handleExportPdf = useCallback(() => {
    if (!distributionResult) {
      return;
    }

    setIsExporting(true);
    try {
      exportDistributionToPdf(distributionResult);
    } finally {
      setIsExporting(false);
    }
  }, [distributionResult]);

  const reset = useCallback(() => {
    setFile(null);
    setBudgetTotal("");
    setMaterials([]);
    setErrors([]);
    setResultInfo(null);
    setDistributionResult(null);
    setIsParsing(false);
  }, []);

  return {
    file,
    budgetTotal,
    materials,
    errors,
    resultInfo,
    distributionResult,
    isParsing,
    isExporting,
    parsedBudget,
    handleFileChange,
    handleBudgetChange,
    validateBudget,
    parseFile,
    calculateDistribution,
    handleExportExcel,
    handleExportPdf,
    reset,
  };
};
