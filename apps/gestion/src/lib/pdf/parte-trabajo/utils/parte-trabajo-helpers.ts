export const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
};

export const resolveImageData = (logoBase64: string) => {
  let imageData = logoBase64;
  if (!logoBase64.startsWith("data:")) {
    imageData = `data:image/jpeg;base64,${logoBase64}`;
  }

  let imageFormat = "JPEG";
  if (imageData.includes("image/png")) {
    imageFormat = "PNG";
  } else if (imageData.includes("image/webp")) {
    imageFormat = "WEBP";
  }

  return {
    imageData,
    imageFormat,
  } as const;
};
