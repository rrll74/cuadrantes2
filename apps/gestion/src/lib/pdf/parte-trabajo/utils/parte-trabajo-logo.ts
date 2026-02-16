export const loadLogoFromApi = async (): Promise<string> => {
  try {
    const response = await fetch("/api/logo");
    if (response.ok) {
      const result = await response.json();
      console.log(`Logo cargado correctamente: ${result.filename}`);
      return result.data;
    }

    const errorData = await response.json();
    console.warn(
      `Error al cargar el logo desde API: ${response.status}`,
      errorData,
    );
    return "";
  } catch (error) {
    console.error("Error fetching logo from API:", error);
    return "";
  }
};
