import {
  DEFAULT_START_Y_MM,
  IMAGE_MAX_HEIGHT_MM,
  IMAGE_MAX_WIDTH_MM,
  IMAGES_PER_PAGE,
  LOGO_HEIGHT_MM,
  LOGO_WIDTH_MM,
  PHOTOS_TITLE_FONT_SIZE,
  PHOTOS_TITLE_TEXT,
  SIGNATURE_BOX_HEIGHT_MM,
  TITLE_FONT_SIZE,
  TITLE_TEXT,
} from "../constants";
import { checkNewPage, type PdfContext } from "../core/parte-trabajo-context";
import { resolveImageData } from "../utils/parte-trabajo-helpers";

export const resetStartPosition = (ctx: PdfContext) => {
  ctx.yPosition = DEFAULT_START_Y_MM;
};

export const addLogo = (ctx: PdfContext, logoBase64: string) => {
  if (!logoBase64) return;

  try {
    const { imageData, imageFormat } = resolveImageData(logoBase64);
    ctx.pdf.addImage(
      imageData,
      imageFormat,
      ctx.layout.margin,
      ctx.yPosition,
      LOGO_WIDTH_MM,
      LOGO_HEIGHT_MM,
    );
    ctx.yPosition += LOGO_HEIGHT_MM + 5;
  } catch (error) {
    console.warn("Error al agregar logo al PDF:", error);
  }
};

export const addTitle = (ctx: PdfContext) => {
  ctx.yPosition += 5;
  ctx.pdf.setFontSize(TITLE_FONT_SIZE);
  ctx.pdf.setFont("helvetica", "bold");
  const titleWidth = ctx.pdf.getTextWidth(TITLE_TEXT);
  ctx.pdf.text(
    TITLE_TEXT,
    (ctx.layout.pageWidth - titleWidth) / 2,
    ctx.yPosition,
  );
  ctx.yPosition += 10;
};

export const addDivider = (ctx: PdfContext) => {
  ctx.pdf.setDrawColor(0, 0, 0);
  ctx.pdf.setLineWidth(0.5);
  ctx.pdf.line(
    ctx.layout.margin,
    ctx.yPosition,
    ctx.layout.pageWidth - ctx.layout.margin,
    ctx.yPosition,
  );
  ctx.yPosition += 8;
};

export const addSignatureSection = (ctx: PdfContext) => {
  checkNewPage(ctx, SIGNATURE_BOX_HEIGHT_MM + 15);
  ctx.yPosition += 5;

  ctx.pdf.setFont("helvetica", "bold");
  ctx.pdf.setFontSize(11);
  ctx.pdf.text(
    "Realizado por (Firma y Sello):",
    ctx.layout.margin,
    ctx.yPosition,
  );
  ctx.yPosition += 5;

  ctx.pdf.setDrawColor(100, 100, 100);
  ctx.pdf.setLineWidth(0.4);
  ctx.pdf.rect(
    ctx.layout.margin,
    ctx.yPosition,
    ctx.layout.contentWidth,
    SIGNATURE_BOX_HEIGHT_MM,
  );

  ctx.yPosition += SIGNATURE_BOX_HEIGHT_MM + 5;
};

export const addImagesSection = (ctx: PdfContext, images: string[]) => {
  if (!images || images.length === 0) return;

  ctx.pdf.addPage();
  ctx.yPosition = ctx.layout.margin + 10;

  ctx.pdf.setFont("helvetica", "bold");
  ctx.pdf.setFontSize(PHOTOS_TITLE_FONT_SIZE);
  ctx.pdf.text(PHOTOS_TITLE_TEXT, ctx.layout.margin, ctx.yPosition);
  ctx.yPosition += 10;

  const maxImgWidth = IMAGE_MAX_WIDTH_MM;
  const maxImgHeight = IMAGE_MAX_HEIGHT_MM;
  let imgCount = 0;

  images.forEach((imgBase64) => {
    if (imgCount > 0 && imgCount % IMAGES_PER_PAGE === 0) {
      ctx.pdf.addPage();
      ctx.yPosition = ctx.layout.margin + 10;
    }

    checkNewPage(ctx, maxImgHeight + 10);

    try {
      const imgProps = ctx.pdf.getImageProperties(imgBase64);
      const imgOriginalWidth = imgProps.width;
      const imgOriginalHeight = imgProps.height;
      const imgAspectRatio = imgOriginalWidth / imgOriginalHeight;

      let finalWidth = maxImgWidth;
      let finalHeight = maxImgWidth / imgAspectRatio;

      if (finalHeight > maxImgHeight) {
        finalHeight = maxImgHeight;
        finalWidth = maxImgHeight * imgAspectRatio;
      }

      const xPosition = (ctx.layout.pageWidth - finalWidth) / 2;
      const yPositionCentered =
        ctx.yPosition + (maxImgHeight - finalHeight) / 2;

      ctx.pdf.addImage(
        imgBase64,
        "JPEG",
        xPosition,
        yPositionCentered,
        finalWidth,
        finalHeight,
      );

      ctx.yPosition += maxImgHeight + 15;
      imgCount += 1;
    } catch (error) {
      console.warn("Error al agregar imagen al PDF:", error);
    }
  });
};
