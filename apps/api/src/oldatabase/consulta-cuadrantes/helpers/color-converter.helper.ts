/**
 * Helper para convertir colores numéricos a formato hexadecimal
 */
export class ColorConverterHelper {
  /**
   * Convierte un color numérico (RGB como entero) a formato hexadecimal
   * Ejemplo: 65280 (Verde) -> '#00FF00'
   */
  static convertToHex(colorNum: number | null | undefined): string {
    if (!colorNum && colorNum !== 0) return '#FFFFFF';
    const hex = colorNum.toString(16).padStart(6, '0');
    return `#${hex}`;
  }
}
