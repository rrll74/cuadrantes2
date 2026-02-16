import type jsPDF from "jspdf";
import {
  addFieldBox,
  addThreeFieldsInLine,
  addTwoFieldsInLine,
} from "./parte-trabajo-fields";
import { formatDate } from "../utils/parte-trabajo-helpers";
import { createDefaultLayout } from "../core/parte-trabajo-layout";
import {
  addDivider,
  addImagesSection,
  addLogo,
  addSignatureSection,
  addTitle,
  resetStartPosition,
} from "./parte-trabajo-sections";
import type { ParteTrabajo } from "../types";

export const renderParteTrabajoPdf = (
  pdf: jsPDF,
  data: ParteTrabajo,
  servicio: string,
  numeroDocumentoConSufijo: string,
  logoBase64: string,
) => {
  const layout = createDefaultLayout();
  const ctx = {
    pdf,
    layout,
    yPosition: 0,
  };

  resetStartPosition(ctx);

  addLogo(ctx, logoBase64);
  addTitle(ctx);
  addDivider(ctx);

  const docAdjuntaValue = data.tieneDocumentacion ? "Sí" : "No";
  const fechaFormato = formatDate(data.fecha);
  addThreeFieldsInLine(
    ctx,
    "TAO",
    numeroDocumentoConSufijo,
    "Doc. Adjunta",
    docAdjuntaValue,
    "Fecha",
    fechaFormato,
  );

  addFieldBox(ctx, "Solicitante:", data.solicitante);

  const servicioText = servicio.substring(0, 60);
  addFieldBox(ctx, "Servicio de destino:", servicioText);

  addFieldBox(ctx, "Lugar de realización:", data.direccion);

  addFieldBox(ctx, "Trabajo a realizar:", data.descripcion, {
    minBoxHeight: 20,
  });

  const fechaEjecValue =
    data.fechaEjecucion && data.fechaEjecucion.trim()
      ? formatDate(data.fechaEjecucion)
      : "";
  addTwoFieldsInLine(
    ctx,
    "Observaciones",
    data.observaciones || "",
    80,
    "Fecha de\nterminación",
    fechaEjecValue,
    20,
    20,
  );

  addSignatureSection(ctx);
  addImagesSection(ctx, data.imagenes || []);
};
