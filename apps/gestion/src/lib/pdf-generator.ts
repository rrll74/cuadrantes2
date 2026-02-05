import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface ParteTrabajo {
  fecha: string;
  numeroDocumento: string;
  tieneDocumentacion: boolean;
  solicitante: string;
  servicios: string[];
  direccion: string;
  descripcion: string;
  imagenes: string[];
  observaciones?: string;
  fechaEjecucion?: string;
}

export const generateParteTrabajoPDF = async (
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
    pdf.save(
      `Parte-Trabajo-${data.numeroDocumento}-${new Date().getTime()}.pdf`,
    );
  } catch (error) {
    console.error("Error al generar PDF:", error);
    throw error;
  }
};

export const generatePDFFromData = async (data: ParteTrabajo) => {
  try {
    // Cargar el logo
    const loadLogo = async (): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg"));
          } else {
            reject(new Error("No se pudo crear el contexto del canvas"));
          }
        };
        img.onerror = () => reject(new Error("No se pudo cargar el logo"));
        img.src = "/headerimg.jpg";
      });
    };

    let logoBase64 = "";
    try {
      logoBase64 = await loadLogo();
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

      let yPosition = 10;
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      // Función auxiliar para verificar si necesita nueva página
      const checkNewPage = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Función auxiliar para agregar texto con saltos de línea
      const addText = (
        text: string,
        fontSize: number = 10,
        fontStyle: "normal" | "bold" = "normal",
        addSpaceBefore: number = 0,
      ) => {
        yPosition += addSpaceBefore;
        checkNewPage(20);

        pdf.setFontSize(fontSize);
        pdf.setFont("helvetica", fontStyle);
        const lines = pdf.splitTextToSize(text, contentWidth);
        const lineHeight = fontSize * 0.35;

        lines.forEach((line: string) => {
          checkNewPage(lineHeight);
          pdf.text(line, margin, yPosition);
          yPosition += lineHeight;
        });

        return yPosition;
      };

      // Logo (si se cargó correctamente)
      if (logoBase64) {
        try {
          const logoWidth = 40;
          const logoHeight = 20;
          pdf.addImage(
            logoBase64,
            "JPEG",
            margin,
            yPosition,
            logoWidth,
            logoHeight,
          );
          yPosition += logoHeight + 5;
        } catch (error) {
          console.warn("Error al agregar logo al PDF:", error);
        }
      }

      // Título
      yPosition += 5;
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      const title = "PARTE DE TRABAJO";
      const titleWidth = pdf.getTextWidth(title);
      pdf.text(title, (pageWidth - titleWidth) / 2, yPosition);
      yPosition += 10;

      // Línea separadora
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Datos principales
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      // Fecha
      addText(`Fecha: ${data.fecha}`, 10, "normal", 0);
      yPosition += 2;

      // Número de documento
      addText(
        `Número de Documento: ${numeroDocumentoConSufijo}`,
        10,
        "normal",
        0,
      );
      yPosition += 2;

      // Documentación adicional
      addText(
        `Documentación Adicional: ${data.tieneDocumentacion ? "Sí" : "No"}`,
        10,
        "normal",
        0,
      );
      yPosition += 2;

      // Solicitante
      addText(`Solicitante: ${data.solicitante}`, 10, "normal", 0);
      yPosition += 5;

      // Servicio (solo el servicio actual)
      pdf.setFont("helvetica", "bold");
      addText("Servicio:", 10, "bold", 0);
      pdf.setFont("helvetica", "normal");
      addText(servicio, 10, "normal", 2);
      yPosition += 5;

      // Dirección
      pdf.setFont("helvetica", "bold");
      addText("Dirección de Ejecución:", 10, "bold", 0);
      pdf.setFont("helvetica", "normal");
      addText(data.direccion, 10, "normal", 2);
      yPosition += 5;

      // Descripción
      pdf.setFont("helvetica", "bold");
      addText("Descripción del Trabajo:", 10, "bold", 0);
      pdf.setFont("helvetica", "normal");
      addText(data.descripcion, 10, "normal", 2);
      yPosition += 5;

      // Observaciones (siempre se muestra)
      pdf.setFont("helvetica", "bold");
      addText("Observaciones:", 10, "bold", 0);
      pdf.setFont("helvetica", "normal");
      if (data.observaciones && data.observaciones.trim()) {
        addText(data.observaciones, 10, "normal", 2);
      } else {
        addText("(Sin observaciones)", 10, "normal", 2);
      }
      yPosition += 5;

      // Fecha de ejecución (siempre se muestra)
      pdf.setFont("helvetica", "bold");
      addText("Fecha de Ejecución:", 10, "bold", 0);
      pdf.setFont("helvetica", "normal");
      if (data.fechaEjecucion && data.fechaEjecucion.trim()) {
        addText(data.fechaEjecucion, 10, "normal", 2);
      } else {
        addText("(Pendiente de especificar)", 10, "normal", 2);
      }
      yPosition += 8;

      // Imágenes
      if (data.imagenes && data.imagenes.length > 0) {
        checkNewPage(30);
        pdf.setFont("helvetica", "bold");
        addText("Imágenes del Trabajo:", 10, "bold", 0);
        yPosition += 5;

        const imgWidth = 60;
        const imgHeight = 45;
        const imagesPerRow = 2;
        let xOffset = margin;
        let imgCount = 0;

        for (const imgBase64 of data.imagenes) {
          // Verificar si necesitamos nueva fila o nueva página
          if (imgCount > 0 && imgCount % imagesPerRow === 0) {
            yPosition += imgHeight + 5;
            xOffset = margin;
          }

          checkNewPage(imgHeight + 5);

          try {
            pdf.addImage(
              imgBase64,
              "JPEG",
              xOffset,
              yPosition,
              imgWidth,
              imgHeight,
            );
            xOffset += imgWidth + 10;
            imgCount++;
          } catch (error) {
            console.warn("Error al agregar imagen al PDF:", error);
          }
        }

        // Ajustar yPosition después de las imágenes
        if (imgCount > 0) {
          yPosition += imgHeight + 10;
        }
      }

      // Espacio para firma y sello (unificado)
      checkNewPage(40);
      yPosition += 10;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Firma y Sello:", margin, yPosition);
      yPosition += 5;

      // Recuadro para firma y sello
      const boxHeight = 30;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, yPosition, contentWidth, boxHeight);

      yPosition += boxHeight + 5;

      // Guardar cada PDF con nombre único
      const timestamp = new Date().getTime();
      const fileName = `Parte-Trabajo-${numeroDocumentoConSufijo}-${timestamp}.pdf`;
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
