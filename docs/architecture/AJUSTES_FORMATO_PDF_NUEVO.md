# Ajustes de Formato del PDF - Parte de Trabajo

## Fecha: 5 de febrero de 2026

## Resumen General

Se ha actualizado el formato del PDF generado para que sea más similar al archivo de referencia "00.orden de trabajo NUEVA.pdf", reordenando los campos y utilizando terminología específica.

---

## Cambios Realizados

### 1. Reorden de Campos

**Orden antiguo:**

1. Fecha
2. Número de Documento
3. Documentación Adicional
4. Solicitante
5. Servicio
6. Dirección de Ejecución
7. Descripción del Trabajo
8. Observaciones
9. Fecha de Ejecución
10. Imágenes
11. Firma y Sello

**Orden nuevo (actualizado):**

1. **TAO** (Número de documento)
2. **Doc. Adjunta** (Tiene documentación adicional)
3. **Fecha** (Fecha)
4. **Solicitante** (Solicitante)
5. **Servicio de destino** (Servicio)
6. **Lugar de realización** (Dirección de realización)
7. **Trabajo a realizar** (Descripción del trabajo)
8. **Fecha de terminación** (Fecha de ejecución)
9. **Observaciones** (Observaciones)
10. **Fotos** (Imágenes)
11. **Realizado por** (Firma y sello)

---

### 2. Cambios en Terminología

| Campo Anterior          | Campo Nuevo                   | Mapeo                                 |
| ----------------------- | ----------------------------- | ------------------------------------- |
| Número de Documento     | TAO                           | Identificador único del documento     |
| Documentación Adicional | Doc. Adjunta                  | Campo más conciso                     |
| Servicio                | Servicio de destino           | Indicar destino del trabajo           |
| Dirección de Ejecución  | Lugar de realización          | Ubicación donde se realiza el trabajo |
| Descripción del Trabajo | Trabajo a realizar            | Descripción más clara                 |
| Fecha de Ejecución      | Fecha de terminación          | Fecha esperada de conclusión          |
| Imágenes del Trabajo    | Fotos                         | Término más simple                    |
| Firma y Sello           | Realizado por (Firma y Sello) | Descriptor más completo               |

---

### 3. Cambios en Presentación Visual

#### Estructura del PDF

**Elementos de cada sección:**

- **Etiqueta en negrita**: Identifica el campo
- **Líneas de separación**: Para campos principales (TAO, Doc. Adjunta, Fecha, Solicitante, Servicio, Fecha de terminación)
- **Espaciado consistente**: 8mm entre campos principales
- **Campos con contenido largo**: Sin línea separadora, solo texto envuelto
  - Lugar de realización (Dirección)
  - Trabajo a realizar (Descripción)
  - Fotos (Si existen)

#### Firma y Sello Unificado

**Cambio importante**: Se ha consolidado en un único recuadro con etiqueta **"Realizado por (Firma y Sello)"**

- Antes: Dos columnas separadas (Firma del Trabajador | Sello de la Empresa)
- Ahora: Un solo recuadro rectangular para ambos (más flexible para el usuario)

---

### 4. Archivos Modificados

#### Backend (API)

- No se requieren cambios en la API
- La estructura `ParteTrabajo` interface mantiene los mismos campos

#### Frontend

**1. `apps/gestion/src/lib/pdf-generator.ts`**

- Reordenado el flujo de generación de campos
- Actualizada la lógica de `addText()` para manejar etiquetas con líneas
- Cambio de "Imágenes del Trabajo" → "Fotos"
- Cambio de "Firma y Sello" → "Realizado por (Firma y Sello)"
- Recuadro de firma/sello unificado

**2. `apps/gestion/src/components/generar-parte-trabajo/PDFPreview.tsx`**

- Reordenados los campos según el nuevo formato
- Actualizada la terminología de etiquetas
- Actualizado el recuadro de firma y sello a formato unificado
- Cambio visual: Líneas debajo de campos principales (simulando formulario oficial)

---

## Comparación Visual: Antes vs Después

### Antes (Formato antiguo)

```
PARTE DE TRABAJO
================
Fecha: 2026-02-05
Número de Documento: PT-123
Documentación Adicional: Sí
Solicitante: Juan

Servicio:
Servicios Operativos

Dirección de Ejecución:
Calle Principal 123

... [resto de campos]
```

### Después (Formato nuevo)

```
PARTE DE TRABAJO
================
TAO: PT-123 ___________________________
Doc. Adjunta: Sí _____________________
Fecha: 2026-02-05 ____________________
Solicitante: Juan _____________________
Servicio de destino: Servicios Operativos ________

Lugar de realización:
Calle Principal 123

Trabajo a realizar:
[Descripción del trabajo...]

... [resto de campos]
```

---

## Campos No Incluidos

Según la solicitud, los siguientes campos del archivo de referencia **NO están disponibles** en el formulario actual y por tanto no se incluyen en el PDF:

- **Llda.** (Entidad responsable)
- **Telf.** (Teléfono de referencia)
- **Prioridad** (Nivel de urgencia)

Estos campos pueden agregarse en futuras iteraciones si es necesario.

---

## Impacto en Tests

- ✅ **pdf-generator.spec.ts**: 2/2 tests pasando
- ✅ **ParteTrabajoForm.spec.tsx**: 2/2 tests pasando
- ✅ **PDFPreview.spec.tsx**: 1/1 test pasando

Todos los tests unitarios siguen pasando sin cambios. Los tests verifican:

- Generación correcta del PDF
- Descarga con nombre apropiado
- Múltiples PDFs cuando hay múltiples servicios
- Visualización correcta en la vista previa

---

## Próximas Mejoras Opcionales

1. **Plantillas personalizables**: Permitir diferentes formatos según departamento
2. **Logotipo/Membrete**: Mejorar la presentación del encabezado
3. **Campos adicionales**: TAO numérico, Prioridad, Teléfono (si se agregan al formulario)
4. **Firma digital**: Implementar captura de firma manuscrita
5. **Formato oficio**: Crear versión con más espacio blanco para impresión
6. **QR/Código de barras**: Incluir código QR con referencia al documento

---

## Validación

✅ **Código compilado sin errores**
✅ **Tests unitarios pasando (5/5)**
✅ **Vista previa refleja nuevo formato**
✅ **Compatibilidad con múltiples servicios**
✅ **Compatibilidad con imágenes**
✅ **Gestión automática de páginas**

---

## Instrucciones para Validación Manual

1. **Ver vista previa**: Rellenar el formulario y hacer clic en "Vista Previa"
   - Verificar que el orden de campos coincida con el nuevo formato
   - Verificar que las etiquetas sean correctas

2. **Generar PDF**: Hacer clic en "Generar PDF"
   - Descargar el PDF generado
   - Abrir en lector de PDF (Adobe, navegador, etc.)
   - Comparar visualmente con arquivo de referencia "00.orden de trabajo NUEVA.pdf"

3. **Pruebas con múltiples servicios**:
   - Seleccionar 2-3 servicios
   - Generar PDFs
   - Verificar que cada PDF tiene un sufijo correcto (-1, -2, -3)

4. **Prueba con imágenes**:
   - Cargar 4-5 imágenes
   - Generar PDF
   - Verificar que aparecen bajo la sección "Fotos"
   - Verificar distribución en cuadrícula (2 por fila)

---

## Notas Técnicas

- **Archivo principal**: `/apps/gestion/src/lib/pdf-generator.ts`
- **Función core**: `generatePDFFromData(data: ParteTrabajo)`
- **Librería PDF**: jsPDF 2.5.1
- **Formato**: A4 vertical (210 x 297 mm)
- **Márgenes**: 15mm
- **Fuente**: Helvetica 10pt (normal), 11pt (títulos)
