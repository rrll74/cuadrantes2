import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  loadLogoFromApi,
  renderParteTrabajoPdf,
  type ParteTrabajo,
} from "./pdf/parte-trabajo";

export type { ParteTrabajo } from "./pdf/parte-trabajo";

export const generateParteTrabajoPdfFromElement = async (
  element: HTMLElement,
  data: ParteTrabajo,
) => {
  try {
    // Convertir el elemento HTML a imagen
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // Ancho A4 en mm
    const pageHeight = 297; // Alto A4 en mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Agregar la imagen al PDF, dividiendo en varias páginas si es necesario
    while (heightLeft >= 0) {
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      position -= pageHeight;
      if (heightLeft > 0) {
        pdf.addPage();
      }
    }

    // Descargar el PDF
    pdf.save(`E-${data.numeroDocumento}.pdf`);
  } catch (error) {
    console.error("Error al generar PDF:", error);
    throw error;
  }
};

export const generateParteTrabajoPdfFromData = async (data: ParteTrabajo) => {
  try {
    let logoBase64 = "";
    try {
      logoBase64 = await loadLogoFromApi();
    } catch (error) {
      console.warn("No se pudo cargar el logo:", error);
    }

    // Generar un PDF por cada servicio seleccionado
    const servicios =
      data.servicios.length > 0
        ? data.servicios
        : ["Sin servicio especificado"];

    for (let i = 0; i < servicios.length; i++) {
      const servicio = servicios[i];
      const numeroDocumentoConSufijo =
        servicios.length > 1
          ? `${data.numeroDocumento}-${i + 1}`
          : data.numeroDocumento;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      renderParteTrabajoPdf(
        pdf,
        data,
        servicio,
        numeroDocumentoConSufijo,
        logoBase64,
      );

      // Guardar cada PDF con nombre único
      //const timestamp = new Date().getTime();
      //const fileName = `Parte-Trabajo-${numeroDocumentoConSufijo}-${timestamp}.pdf`;
      const fileName = `E-${numeroDocumentoConSufijo}.pdf`;
      pdf.save(fileName);

      // Pequeña pausa entre PDFs para evitar problemas de descarga
      if (i < servicios.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    console.error("Error al generar PDF:", error);
    throw error;
  }
};
