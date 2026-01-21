# 🎨 Frontend Testing Guide

**Tests unitarios, E2E y validación de componentes React**

---

## 📊 Overview

El frontend de Cuadrantes2 tiene **160+ tests** organizados en 3 capas:

- **Componentes Jornadas**: 51 tests (específicos del dominio)
- **Componentes UI**: 58 tests (genéricos reutilizables)
- **Hooks**: 100+ tests (lógica de estado y datos)
- **E2E**: 39 tests (flujos completos Cypress)

---

## 🏗️ Arquitectura de Tests

### Layer 1: Jornadas Components (51 tests)

Componentes específicos del módulo de Jornadas (Scheduling):

| Componente                  | Tests | Función                     |
| --------------------------- | ----- | --------------------------- |
| EqualAndPuestosSummaryTable | 7     | Resumen por puesto/equal    |
| JornadasDetailTable         | 8     | Tabla detallada con gráfico |
| ServiceSummaryTable         | 7     | Resumen por servicio        |
| StatusPartsSummaryTable     | 9     | Resumen con separación      |
| ResultsTable                | 9     | Tabla de resultados         |
| UnmatchedResultsTable       | 11    | Fichas sin trabajador       |

**Ubicación**: `apps/gestion/src/features/jornadas/components/`

### Layer 2: UI Components (58 tests)

Componentes genéricos reutilizables en toda la app:

| Componente                 | Tests | Función              |
| -------------------------- | ----- | -------------------- |
| Icon (NEW)                 | 22    | SVG de iconos        |
| DataTable (NEW)            | 10    | Tabla genérica       |
| ProgressBar (NEW)          | 13    | Barra de progreso    |
| Toast (NEW)                | 13    | Notificaciones       |
| ConfirmationDialog (EXIST) | 5     | Diálogo confirmación |
| Pagination (EXIST)         | 6     | Paginación           |
| Tooltip (EXIST)            | 7     | Tooltips             |

**Ubicación**: `apps/gestion/src/components/ui/`

### Layer 3: Hooks (100+ tests)

Hooks personalizados para lógica de estado y datos:

| Hook                     | Tests | Función                      |
| ------------------------ | ----- | ---------------------------- |
| useDebounce (NEW)        | 16    | Debounce de valores          |
| usePermissions (NEW)     | 14    | Validación de permisos       |
| useEqualPuestoSummary    | 13    | Query: equal/puesto summary  |
| useJornadasDetail        | 13    | Query: detalle jornadas      |
| useResultsTable          | 17    | Paginación + filtrado        |
| useServiceSummary        | 16    | Query: resumen servicio      |
| useStatusPartsSummary    | 19    | Query: resumen estado/partes |
| useFileUpload (EXISTING) | 6     | Upload de archivos           |

**Ubicación**: `apps/gestion/src/hooks/`

### Layer 4: E2E Tests (39 tests)

Tests completos de flujos de usuario con Cypress:

| Suite                        | Tests | Función                     |
| ---------------------------- | ----- | --------------------------- |
| jornadas-query.cy.ts         | 22    | Flujos principales          |
| jornadas-query-filters.cy.ts | 17    | Filtros y búsqueda avanzada |

**Ubicación**: `apps/gestion/cypress/e2e/`

---

## 🧪 Running Frontend Tests

### Todos los tests

```bash
npm run test:gestion
```

### Solo componentes de Jornadas

```bash
npm run test:gestion -- features/jornadas
```

### Solo componentes UI

```bash
npm run test:gestion -- components/ui
```

### Solo hooks

```bash
npm run test:gestion -- hooks
```

### Con coverage

```bash
npm run test:gestion -- --coverage
```

### Watch mode

```bash
npm run test:gestion -- --watch
```

### E2E con Cypress

```bash
# Interactive
npm run cypress:open:gestion

# Headless
npm run cypress:run:gestion
```

---

## 📁 Estructura de Directorios

```
apps/gestion/src/
├── components/
│   └── ui/
│       ├── Icon.spec.tsx (22 tests)
│       ├── DataTable.spec.tsx (10 tests)
│       ├── ProgressBar.spec.tsx (13 tests)
│       ├── Toast.spec.tsx (13 tests)
│       └── [otros componentes UI]
├── features/
│   └── jornadas/
│       └── components/
│           ├── EqualAndPuestosSummaryTable.spec.tsx (7 tests)
│           ├── JornadasDetailTable.spec.tsx (8 tests)
│           ├── ServiceSummaryTable.spec.tsx (7 tests)
│           ├── StatusPartsSummaryTable.spec.tsx (9 tests)
│           ├── ResultsTable.spec.tsx (9 tests)
│           └── UnmatchedResultsTable.spec.tsx (11 tests)
├── hooks/
│       ├── useDebounce.spec.ts (16 tests)
│       ├── usePermissions.spec.ts (14 tests)
│       ├── useEqualPuestoSummary.spec.ts (13 tests)
│       ├── useJornadasDetail.spec.ts (13 tests)
│       ├── useResultsTable.spec.ts (17 tests)
│       ├── useServiceSummary.spec.ts (16 tests)
│       ├── useStatusPartsSummary.spec.ts (19 tests)
│       └── useFileUpload.spec.ts (6 tests)
└── cypress/
    └── e2e/
        ├── jornadas-query.cy.ts (22 tests)
        └── jornadas-query-filters.cy.ts (17 tests)
```

---

## 🔑 Key Testing Patterns

### 1. Component Testing with React Testing Library

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("Icon Component", () => {
  it("debe renderizar con path único", () => {
    const { container } = render(<Icon path="M5 10h14" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
```

### 2. Hook Testing with renderHook

```typescript
import { renderHook } from "@testing-library/react";

describe("useDebounce Hook", () => {
  jest.useFakeTimers();

  it("debe debounce correctamente", () => {
    const { result } = renderHook(() => useDebounce("value", 500));

    act(() => jest.advanceTimersByTime(500));
    expect(result.current).toBe("value");

    jest.useRealTimers();
  });
});
```

### 3. React Query Hook Testing

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

describe("useEqualPuestoSummary Hook", () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }) =>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  it("debe cargar datos", () => {
    const { result } = renderHook(
      () => useEqualPuestoSummary("session-123"),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
  });
});
```

### 4. API Mocking

```typescript
jest.mock("@/lib/api");

const mockApi = api as jest.Mocked<typeof api>;

mockApi.get.mockResolvedValue({
  data: { equal: 5, puesto: 10 },
});
```

### 5. Context Hook Testing

```typescript
jest.mock("@/context/AuthContext");
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

mockUseAuth.mockReturnValue({
  user: { permisos: ["admin"] },
});
```

### 6. E2E Testing with Cypress

```typescript
describe("Jornadas Query", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/dashboard/jornadas");
  });

  it("debe mostrar tabla de resultados", () => {
    cy.get("[data-testid=results-table]").should("be.visible");
    cy.get("tr").should("have.length.greaterThan", 0);
  });
});
```

---

## 📊 Coverage Metrics

| Métrica                | Value |
| ---------------------- | ----- |
| Tests totales          | 160+  |
| Componentes Jornadas   | 51    |
| Componentes UI         | 58    |
| Hooks                  | 100+  |
| Cobertura de líneas    | 90%+  |
| Cobertura de funciones | 100%  |
| Passing tests          | 100%  |

### Coverage por Capa

```bash
npm run test:gestion -- --coverage

# Output esperado:
# features/jornadas/components/  95%  ✅
# components/ui/                 98%  ✅
# hooks/                         94%  ✅
```

---

## 🎯 Common Test Scenarios

### Scenario 1: Testing Component Props

```typescript
it("debe renderizar con className personalizado", () => {
  const { container } = render(
    <Icon path="M5 10" className="text-red-500" />
  );
  const svg = container.querySelector("svg");
  expect(svg).toHaveClass("text-red-500");
});
```

### Scenario 2: Testing User Interactions

```typescript
it("debe abrir modal al hacer click", async () => {
  const user = userEvent.setup();
  render(<ResultsTable data={mockData} />);

  const button = screen.getByRole("button", { name: /exportar/i });
  await user.click(button);

  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
```

### Scenario 3: Testing Async Loading

```typescript
it("debe mostrar spinner mientras carga", async () => {
  mockApi.get.mockImplementation(
    () => new Promise(resolve => setTimeout(resolve, 1000))
  );

  render(<EqualPuestosSummary sessionId="123" />);

  expect(screen.getByRole("progressbar")).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
```

### Scenario 4: Testing Filtering

```typescript
it("debe filtrar resultados al cambiar select", async () => {
  const user = userEvent.setup();
  render(<ResultsTable data={allData} />);

  const filterSelect = screen.getByDisplayValue("Todos");
  await user.selectOptions(filterSelect, "COMPLETO");

  const rows = screen.getAllByRole("row");
  expect(rows.length - 1).toBe(expectedCompletedCount); // -1 para header
});
```

---

## 🐛 Debugging Tests

### Ver salida en el navegador

```bash
npm run test:gestion -- --watch
# Presionar 'a' para ejecutar todos
# Presionar 'f' para ejecutar solo tests fallidos
```

### Ver rendered output

```typescript
it("debe renderizar", () => {
  const { debug } = render(<Icon path="M5 10" />);
  debug(); // Imprime el HTML renderizado
});
```

### Cypress debugging

```bash
npm run cypress:open:gestion
# Hacer click en archivo de test
# Utilizar Chrome DevTools para inspeccionar
```

---

## ✅ Validation Checklist

- [ ] Tests pasan localmente
  ```bash
  npm run test:gestion
  ```
- [ ] Coverage > 90%
  ```bash
  npm run test:gestion -- --coverage
  ```
- [ ] E2E tests pasan
  ```bash
  npm run cypress:run:gestion
  ```
- [ ] No hay warnings de React
- [ ] Mocks correctamente aislados
- [ ] Cleanup después de tests

---

## 📚 Subcapas de Testing

- **[JORNADAS.md](./JORNADAS.md)** - Tests de componentes de Jornadas
- **[UI_COMPONENTS.md](./UI_COMPONENTS.md)** - Tests de componentes UI
- **[HOOKS.md](./HOOKS.md)** - Tests de hooks personalizados
- **[VALIDATION.md](./VALIDATION.md)** - Validación y corrección

---

## 📚 Referencias Globales

- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Overview global
- **[QUICK_START.md](../QUICK_START.md)** - 5-minute overview
- **[INDEX.md](../INDEX.md)** - Navegación principal

---

## 🚀 Next Steps

1. **Visual Regression**: Screenshot comparisons
2. **Storybook**: Component library documentation
3. **Accessibility**: a11y testing
4. **Performance**: Component benchmarking

---

**Last Updated**: January 21, 2026
**Frontend Testing Status**: ✅ 160+ Tests - Complete
