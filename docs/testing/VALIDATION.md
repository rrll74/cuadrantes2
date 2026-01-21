# 🔧 Validation & Correction Guide

**Instrucciones paso a paso para validar y corregir tests**

---

## ✅ Tests Operativos (100% Pasando)

### Verificar Tests Operativos

```bash
cd /home/ramon/code/cuadrantes2

# Ejecutar solo los tests que funcionan perfectamente
npm run test:gestion -- --testPathPattern="(Icon|useDebounce|usePermissions)\.spec"

# Resultado esperado:
# ✅ Test Suites: 3 passed, 3 total
# ✅ Tests: 52 passed, 52 total
```

### Tests Individuales

```bash
# Ejecutar Icon Component tests
npm run test:gestion -- src/components/ui/Icon.spec.tsx

# Ejecutar useDebounce tests
npm run test:gestion -- src/hooks/useDebounce.spec.ts

# Ejecutar usePermissions tests
npm run test:gestion -- src/hooks/usePermissions.spec.ts
```

---

## ⚠️ Tests Que Requieren Ajustes

### Archivos Afectados (8)

- `ProgressBar.spec.tsx` - Validación de estilos CSS
- `DataTable.spec.tsx` - Renderización de tabla
- `Toast.spec.tsx` - Timer y cleanup
- `useEqualPuestoSummary.spec.ts` - Mock de API
- `useJornadasDetail.spec.ts` - Mock de API
- `useResultsTable.spec.ts` - Mock de API
- `useServiceSummary.spec.ts` - Mock de API
- `useStatusPartsSummary.spec.ts` - Mock de API

### Categorización de Problemas

#### **Grupo 1: UI Components** (3 archivos)

**Síntoma**: Tests fallan en validaciones de CSS/Styles
**Causa**: Discrepancia entre tests y implementación real del componente
**Solución**:

1. Revisar implementación del componente
2. Ajustar tests para coincidir con CSS real

```bash
# Para diagnosticar
npm run test:gestion -- ProgressBar.spec.tsx --verbose
# Verá exactamente qué CSS espera vs cuál tiene
```

#### **Grupo 2: React Query Hooks** (5 archivos)

**Síntoma**: `Cannot read properties of undefined (reading 'mockResolvedValue')`
**Causa**: Mock de API incorrecto (usa `mockApiCall` en lugar de `mockApi.get`)
**Solución**: Cambiar pattern de mock:

```typescript
// ❌ INCORRECTO (actual)
import * as api from "@/lib/api";
const mockApiCall = api.getEqualPuestoSummary as jest.MockedFunction<...>;
mockApiCall.mockResolvedValue(data);

// ✅ CORRECTO
import api from "@/lib/api";
const mockApi = api as jest.Mocked<typeof api>;
(mockApi.get as jest.Mock).mockResolvedValue({ data });
```

---

## 🔧 Proceso de Corrección

### Paso 1: Validar Implementación del Componente

```bash
# Revisar ProgressBar.tsx para entender CSS real
cat apps/gestion/src/components/ui/ProgressBar.tsx

# El test espera inline styles, pero podría estar usando Tailwind
# Ajustar test o componente según la realidad
```

### Paso 2: Corregir Mocks de React Query

**Archivo**: `apps/gestion/src/hooks/useEqualPuestoSummary.spec.ts`

Cambiar líneas 1-20 de:

```typescript
import * as api from "@/lib/api";
jest.mock("@/lib/api");
const mockApiCall = api.getEqualPuestoSummary as jest.MockedFunction<...>;
```

A:

```typescript
import api from "@/lib/api";
jest.mock("@/lib/api");
const mockApi = api as jest.Mocked<typeof api>;
beforeEach(() => {
  jest.clearAllMocks();
  mockApi.get = jest.fn();
});
```

Luego reemplazar todas las líneas:

```typescript
mockApiCall.mockResolvedValue(...)
```

Por:

```typescript
(mockApi.get as jest.Mock).mockResolvedValue({ data: ... })
```

### Paso 3: Verificar Tests Arreglados

```bash
npm run test:gestion -- useEqualPuestoSummary.spec.ts
# Debería mostrar: ✅ PASS
```

---

## 📊 Monitoreo de Progreso

### Comando para Ver Estado Actual

```bash
npm run test:gestion -- --listTests | wc -l
# Muestra total de archivos de test

npm run test:gestion -- --no-coverage 2>&1 | tail -20
# Muestra resumen de resultados
```

### Archivo de Referencia Rápida

```bash
# Tests que PASAN (ejecutar primero para validar setup)
npm run test:gestion -- Icon.spec.tsx useDebounce.spec.ts usePermissions.spec.ts

# Si estos 3 pasan, el ambiente está bien configurado
# Entonces proceder con los demás
```

---

## 🎯 Orden Recomendado de Corrección

1. **Validar UI Components** (30 min)
   - Revisar ProgressBar, DataTable, Toast
   - Ajustar tests O componentes

2. **Corregir React Query Mocks** (20 min)
   - Aplicar cambio de mock pattern
   - Ejecutar cada hook test

3. **Validación Final** (5 min)
   - `npm run test:gestion -- --no-coverage`
   - Verificar 166+ tests pasando

---

## 💡 Tips de Debugging

### Ver Exactamente Qué Falla

```bash
# Con verbosity
npm run test:gestion -- Icon.spec.tsx --verbose --no-coverage

# Mostrará:
# - Qué test falló
# - Qué se esperaba
# - Qué se obtuvo
```

### Ejecutar Test Específico

```bash
# Dentro del archivo Icon.spec.tsx, solo el test:
# "debe renderizar con path único"
npm run test:gestion -- Icon.spec.tsx -t "debe renderizar con path"
```

### Ver Cobertura

```bash
npm run test:gestion -- Icon.spec.tsx --coverage --collectCoverageFrom="src/components/ui/Icon.tsx"
```

---

## 📋 Checklist de Validación

- [ ] Tests operativos pasan (52 tests)

  ```bash
  npm run test:gestion -- --testPathPattern="(Icon|useDebounce|usePermissions)"
  ```

- [ ] ProgressBar tests ajustados

  ```bash
  npm run test:gestion -- ProgressBar.spec.tsx
  ```

- [ ] DataTable tests ajustados

  ```bash
  npm run test:gestion -- DataTable.spec.tsx
  ```

- [ ] Toast tests ajustados

  ```bash
  npm run test:gestion -- Toast.spec.tsx
  ```

- [ ] React Query hooks tests arreglados (5 files)

  ```bash
  npm run test:gestion -- --testPathPattern="use(EqualPuesto|JornadasDetail|ResultsTable|ServiceSummary|StatusPartsSummary)"
  ```

- [ ] Suite completa pasando
  ```bash
  npm run test:gestion -- --no-coverage
  ```

---

## 📞 Referencia de Documentos

- **[INDEX.md](./INDEX.md)** - Punto de entrada
- **[QUICK_START.md](./QUICK_START.md)** - Estado y próximos pasos
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Resumen global
- **[backend/README.md](./backend/README.md)** - Backend tests
- **[frontend/README.md](./frontend/README.md)** - Frontend tests

---

## 🚀 Próximas Acciones

1. **Hoy**: Validar tests operativos
2. **Mañana**: Corregir UI Components y React Query
3. **Validación Final**: 100% de tests pasando

---

**Nota**: Todos los archivos de test tienen estructura completa y comentarios. Solo necesitan ajustes menores para coincidir con la implementación real de los componentes y la forma correcta de mockear la API.

La mayoría del trabajo está hecho. Estas correcciones son mecánicas y toman <1 hora en total.

---

**Last Updated**: January 21, 2026
**Validation Guide Version**: 1.0
