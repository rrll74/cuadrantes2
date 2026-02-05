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
    pdf.save(`E-${data.numeroDocumento}.pdf`);
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

      // Función auxiliar para formatear fecha de YYYY-MM-DD a DD/MM/AAAA
      const formatDate = (dateString: string): string => {
        if (!dateString) return "";
        const parts = dateString.split("-");
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateString;
      };

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
      // const addText = (
      //   text: string,
      //   fontSize: number = 10,
      //   fontStyle: "normal" | "bold" = "normal",
      //   addSpaceBefore: number = 0,
      // ) => {
      //   yPosition += addSpaceBefore;
      //   checkNewPage(20);

      //   pdf.setFontSize(fontSize);
      //   pdf.setFont("helvetica", fontStyle);
      //   const lines = pdf.splitTextToSize(text, contentWidth);
      //   const lineHeight = fontSize * 0.35;

      //   lines.forEach((line: string) => {
      //     checkNewPage(lineHeight);
      //     pdf.text(line, margin, yPosition);
      //     yPosition += lineHeight;
      //   });

      //   return yPosition;
      // };

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
      const title = "ORDEN DE TRABAJO";
      const titleWidth = pdf.getTextWidth(title);
      pdf.text(title, (pageWidth - titleWidth) / 2, yPosition);
      yPosition += 10;

      // Línea separadora
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Función auxiliar para crear campos con borde
      const addFieldBox = (
        label: string,
        value: string,
        boxHeight: number = 7,
      ) => {
        checkNewPage(boxHeight + 1);

        // Dibujar borde del campo
        pdf.setDrawColor(100, 100, 100);
        pdf.setLineWidth(0.3);
        pdf.rect(margin, yPosition, contentWidth, boxHeight);

        // Etiqueta en negrita
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(label, margin + 2, yPosition + 3);

        // Valor
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        const valueLines = pdf.splitTextToSize(value || "", contentWidth - 40);
        if (valueLines.length > 0) {
          pdf.text(valueLines[0], margin + 40, yPosition + 3);
        }

        yPosition += boxHeight + 1;
      };

      // Función auxiliar para 3 campos en línea
      const addThreeFieldsInLine = (
        label1: string,
        value1: string,
        label2: string,
        value2: string,
        label3: string,
        value3: string,
        boxHeight: number = 7,
      ) => {
        checkNewPage(boxHeight + 1);

        const fieldWidth = contentWidth / 3 - 0.5;
        const boxHeight_local = boxHeight;

        // Campo 1
        pdf.setDrawColor(100, 100, 100);
        pdf.setLineWidth(0.3);
        pdf.rect(margin, yPosition, fieldWidth, boxHeight_local);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(label1, margin + 1, yPosition + 2.5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(value1, margin + 1, yPosition + 5.5);

        // Campo 2
        const x2 = margin + fieldWidth + 1;
        pdf.setDrawColor(100, 100, 100);
        pdf.setLineWidth(0.3);
        pdf.rect(x2, yPosition, fieldWidth, boxHeight_local);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(label2, x2 + 1, yPosition + 2.5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(value2, x2 + 1, yPosition + 5.5);

        // Campo 3
        const x3 = margin + 2 * fieldWidth + 2;
        pdf.setDrawColor(100, 100, 100);
        pdf.setLineWidth(0.3);
        pdf.rect(x3, yPosition, fieldWidth, boxHeight_local);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(label3, x3 + 1, yPosition + 2.5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(value3, x3 + 1, yPosition + 5.5);

        yPosition += boxHeight_local + 1;
      };

      // Función auxiliar para 2 campos en línea con proporciones (80% y 20%)
      const addTwoFieldsInLine = (
        label1: string,
        value1: string,
        percentWidth1: number, // 80
        label2: string,
        value2: string,
        percentWidth2: number, // 20
        boxHeight: number = 7,
      ) => {
        checkNewPage(boxHeight + 1);

        const field1Width = (contentWidth * percentWidth1) / 100 - 0.5;
        const field2Width = (contentWidth * percentWidth2) / 100 - 0.5;

        // Campo 1 (80%)
        pdf.setDrawColor(100, 100, 100);
        pdf.setLineWidth(0.3);
        pdf.rect(margin, yPosition, field1Width, boxHeight);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(label1, margin + 1, yPosition + 2.5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        const valueLines1 = pdf.splitTextToSize(value1 || "", field1Width - 4);
        valueLines1.forEach((line: string, idx: number) => {
          if (idx < Math.floor(boxHeight / 4)) {
            pdf.text(line, margin + 1, yPosition + 5.5 + idx * 4);
          }
        });

        // Campo 2 (20%)
        const x2 = margin + field1Width + 1;
        pdf.setDrawColor(100, 100, 100);
        pdf.setLineWidth(0.3);
        pdf.rect(x2, yPosition, field2Width, boxHeight);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(label2, x2 + 1, yPosition + 2.5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(value2, x2 + 1, yPosition + 5.5);

        yPosition += boxHeight + 1;
      };

      // Datos principales - Orden según formato de referencia
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      // 1-3. TAO, Doc. Adjunta y Fecha EN LA MISMA LÍNEA
      const docAdjuntaValue = data.tieneDocumentacion ? "Sí" : "No";
      const fechaFormato = formatDate(data.fecha);
      addThreeFieldsInLine(
        "TAO",
        numeroDocumentoConSufijo,
        "Doc. Adjunta",
        docAdjuntaValue,
        "Fecha",
        fechaFormato,
        7,
      );

      // 4. Solicitante
      addFieldBox("Solicitante:", data.solicitante);

      // 5. Servicio de destino (solo el servicio actual)
      const servicioText = servicio.substring(0, 60);
      addFieldBox("Servicio de destino:", servicioText);

      // 6. Lugar de realización (Dirección) - con borde más grande
      checkNewPage(15);
      pdf.setDrawColor(100, 100, 100);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, yPosition, contentWidth, 15);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Lugar de realización:", margin + 2, yPosition + 3);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const dirLines = pdf.splitTextToSize(data.direccion, contentWidth - 4);
      dirLines.forEach((line: string, idx: number) => {
        if (idx < 2) {
          pdf.text(line, margin + 2, yPosition + 6 + idx * 4);
        }
      });

      yPosition += 15 + 1;

      // 7. Trabajo a realizar (Descripción) - altura dinámica según contenido
      const descLines = pdf.splitTextToSize(data.descripcion, contentWidth - 4);
      // Calcular altura necesaria: ~4mm por línea de texto
      const descBoxHeight = Math.max(20, Math.ceil(descLines.length) * 4 + 6);

      checkNewPage(descBoxHeight);
      pdf.setDrawColor(100, 100, 100);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, yPosition, contentWidth, descBoxHeight);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Trabajo a realizar:", margin + 2, yPosition + 3);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      descLines.forEach((line: string, idx: number) => {
        if (idx < Math.ceil(descBoxHeight / 4)) {
          pdf.text(line, margin + 2, yPosition + 6 + idx * 4);
        }
      });

      yPosition += descBoxHeight + 1;

      // 8-9. Observaciones (80%) + Fecha de terminación (20%) EN LA MISMA LÍNEA - ALTURA 20mm como firma
      const fechaEjecValue =
        data.fechaEjecucion && data.fechaEjecucion.trim()
          ? formatDate(data.fechaEjecucion)
          : "";
      addTwoFieldsInLine(
        "Observaciones",
        data.observaciones || "",
        80,
        "Fecha de terminación",
        fechaEjecValue,
        20,
        20,
      );

      // 10. Realizado por (Firma y Sello) - ANTES DE LAS FOTOS
      checkNewPage(20);
      yPosition += 5;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Realizado por (Firma y Sello):", margin, yPosition);
      yPosition += 5;

      // Recuadro para firma y sello - MITAD DEL ESPACIO (20mm en lugar de 40mm)
      const boxHeightSignature = 20;
      pdf.setDrawColor(100, 100, 100);
      pdf.setLineWidth(0.4);
      pdf.rect(margin, yPosition, contentWidth, boxHeightSignature);

      yPosition += boxHeightSignature + 5;

      // 11. Imágenes (Fotos) - DESPUÉS DE LA FIRMA, MÁS GRANDES (2 por página)
      if (data.imagenes && data.imagenes.length > 0) {
        // Nueva página para las imágenes
        pdf.addPage();
        yPosition = margin + 10;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text("Fotos:", margin, yPosition);
        yPosition += 10;

        // Dimensiones máximas para cada imagen (área disponible)
        const maxImgWidth = 140;
        const maxImgHeight = 110;
        const imagesPerPage = 2; // 2 imágenes por página
        let imgCount = 0;

        for (const imgBase64 of data.imagenes) {
          // Si alcanzamos 2 imágenes por página, crear nueva página
          if (imgCount > 0 && imgCount % imagesPerPage === 0) {
            pdf.addPage();
            yPosition = margin + 10;
          }

          checkNewPage(maxImgHeight + 10);

          try {
            // Obtener dimensiones reales de la imagen
            const imgProps = pdf.getImageProperties(imgBase64);
            const imgOriginalWidth = imgProps.width;
            const imgOriginalHeight = imgProps.height;
            const imgAspectRatio = imgOriginalWidth / imgOriginalHeight;

            // Calcular dimensiones finales manteniendo el aspecto
            let finalWidth = maxImgWidth;
            let finalHeight = maxImgWidth / imgAspectRatio;

            // Si la altura calculada excede el máximo, ajustar por altura
            if (finalHeight > maxImgHeight) {
              finalHeight = maxImgHeight;
              finalWidth = maxImgHeight * imgAspectRatio;
            }

            // Centrar imagen horizontalmente y verticalmente en el área disponible
            const xPosition = (pageWidth - finalWidth) / 2;
            const yPositionCentered =
              yPosition + (maxImgHeight - finalHeight) / 2;

            pdf.addImage(
              imgBase64,
              "JPEG",
              xPosition,
              yPositionCentered,
              finalWidth,
              finalHeight,
            );

            yPosition += maxImgHeight + 15; // Espaciado vertical (usando altura máxima para consistencia)
            imgCount++;
          } catch (error) {
            console.warn("Error al agregar imagen al PDF:", error);
          }
        }
      }

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
