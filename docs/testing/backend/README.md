# 🔬 Backend Testing Guide

**Tests unitarios e integración de la API NestJS**

---

## 📊 Overview

El backend de Cuadrantes2 tiene **124 tests** enfocados en el módulo de jornadas:

- **Helpers**: 82 tests (funciones de transformación y cálculo)
- **Services**: 35 tests (lógica de negocio)
- **E2E**: 20 tests (integración SQLite)

---

## 🏗️ Arquitectura de Tests

### Layer 1: Helpers (82 tests)

Los helpers son funciones puras que transforman y calculan datos:

| Helper                       | Tests | Función                             |
| ---------------------------- | ----- | ----------------------------------- |
| SessionQueryHelper           | 14    | Paginación, filtrado, búsqueda      |
| SessionStatsHelper           | 15    | Estadísticas, cálculos              |
| JornadasTableHelper          | 16    | Renderización tabla detallada       |
| JornadasServiceSummaryHelper | 14    | Resumen por servicio                |
| JornadasWorkerSummaryHelper  | 17    | Resumen por trabajador/equal/puesto |
| JornadasStatusSummaryHelper  | 13    | Resumen por estado y presencia      |

**Ubicación**: `apps/api/src/newdatabase/jornadas/helpers/`

**Pattern**:

```typescript
describe("SessionQueryHelper", () => {
  const helper = new SessionQueryHelper(mockData);

  it("debe paginar correctamente", () => {
    const result = helper.paginate(1, 10);
    expect(result.data).toHaveLength(10);
    expect(result.total).toBe(mockData.length);
  });
});
```

### Layer 2: Services (35 tests)

Los services integran helpers y acceden a la base de datos:

| Service                      | Tests | Función                  |
| ---------------------------- | ----- | ------------------------ |
| JornadasQueryService         | 15    | API principal de queries |
| [Otros servicios del módulo] | 20    | Importación, matching    |

**Ubicación**: `apps/api/src/newdatabase/jornadas/services/`

**Pattern**:

```typescript
describe("JornadasQueryService", () => {
  beforeEach(() => {
    moduleRef = Test.createTestingModule({ ... });
    service = moduleRef.get(JornadasQueryService);
  });

  it("debe devolver query results", async () => {
    const result = await service.query(sessionId);
    expect(result.results).toBeDefined();
  });
});
```

### Layer 3: E2E Tests (20 tests)

Tests de integración completa con base de datos SQLite:

**Ubicación**: `apps/api/test/`

**Archivos**:

- `jornadas-summary.e2e-spec.ts` (7 tests)
- `jornadas-equal-puesto-summary.e2e-spec.ts` (7 tests)
- `jornadas-status-parts-summary.e2e-spec.ts` (6 tests)

**Pattern**:

```typescript
describe("Jornadas Query E2E (SQLite)", () => {
  beforeAll(async () => {
    module = await Test.createTestingModule({ ... }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  it("debe cargar datos correctamente", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/jornadas/session-123/results")
      .expect(200);
    expect(res.body.results).toBeDefined();
  });
});
```

---

## 🧪 Running Backend Tests

### Todos los tests backend

```bash
npm run test:api
```

### Solo tests unitarios

```bash
npm run test:api -- --testPathIgnore="e2e"
```

### Solo tests E2E

```bash
npm run test:apie2e
```

### Con coverage

```bash
npm run test:api -- --coverage
```

### Específico

```bash
# Un helper
npm run test:api -- session-query.helper.spec.ts

# Una suite
npm run test:api -- jornadas.module.spec.ts

# Watch mode
npm run test:api -- --watch
```

---

## 📁 Estructura de Directorios

```
apps/api/
├── src/newdatabase/
│   └── jornadas/
│       ├── helpers/
│       │   ├── session-query.helper.spec.ts (14 tests)
│       │   ├── session-stats.helper.spec.ts (15 tests)
│       │   ├── jornadas-table.helper.spec.ts (16 tests)
│       │   ├── jornadas-service-summary.helper.spec.ts (14 tests)
│       │   ├── jornadas-worker-summary.helper.spec.ts (17 tests)
│       │   └── jornadas-status-summary.helper.spec.ts (13 tests)
│       └── services/
│           ├── jornadas-query.service.spec.ts (15 tests)
│           └── [otros services]
├── test/
│   ├── jornadas-summary.e2e-spec.ts (7 tests)
│   ├── jornadas-equal-puesto-summary.e2e-spec.ts (7 tests)
│   └── jornadas-status-parts-summary.e2e-spec.ts (6 tests)
└── jest.config.js (unitarios)
    jest-e2e.config.js (E2E)
```

---

## 🔑 Key Testing Patterns

### 1. Setup de Testing Module

```typescript
let moduleRef: TestingModule;
let service: JornadasQueryService;
let repository: Repository<ImportSession>;

beforeEach(async () => {
  moduleRef = await Test.createTestingModule({
    imports: [TypeOrmModule.forFeature([ImportSession])],
    providers: [JornadasQueryService],
  }).compile();

  service = moduleRef.get<JornadasQueryService>(JornadasQueryService);
  repository = moduleRef.get(getRepositoryToken(ImportSession));
});
```

### 2. Mock de Repositorio

```typescript
const mockRepository = {
  find: jest.fn().mockResolvedValue([mockSession]),
  findOne: jest.fn().mockResolvedValue(mockSession),
  save: jest.fn().mockResolvedValue(mockSession),
};
```

### 3. Testing de Helpers Puros

```typescript
const helper = new SessionQueryHelper(rawData);
const result = helper.paginate(pageNumber, pageSize);
expect(result).toEqual({ data: [...], total: 100 });
```

### 4. Testing de Servicios

```typescript
const result = await service.query(sessionId);
expect(service.repository.find).toHaveBeenCalledWith(expect.any(Object));
expect(result.results).toBeDefined();
```

### 5. E2E con SQLite

```typescript
// Base de datos en memoria
TypeOrmModule.forRoot({
  type: 'sqlite',
  database: ':memory:',
  entities: [...],
  synchronize: true,
})

// Seed de datos antes de tests
await seedTestDatabase();
```

---

## 📊 Coverage Metrics

| Métrica                | Value |
| ---------------------- | ----- |
| Tests totales          | 124   |
| Cobertura de líneas    | 95%+  |
| Cobertura de funciones | 100%  |
| Cobertura de branches  | 90%+  |
| Passing tests          | 100%  |

### Coverage por Helper

```bash
npm run test:api -- --coverage

# Output esperado:
# session-query.helper.ts        95%  ✅
# session-stats.helper.ts        98%  ✅
# jornadas-table.helper.ts       92%  ✅
# jornadas-service-summary.ts    96%  ✅
# jornadas-worker-summary.ts     94%  ✅
# jornadas-status-summary.ts     97%  ✅
```

---

## 🐛 Debugging Tests

### Ver salida detallada

```bash
npm run test:api -- --verbose
```

### Ejecutar solo un test

```bash
npm run test:api -- --testNamePattern="debe paginar"
```

### Con logs

```bash
npm run test:api -- --detectOpenHandles
```

### Watch mode

```bash
npm run test:api -- --watch
```

---

## 🎯 Common Test Scenarios

### Scenario 1: Paginar Resultados

```typescript
it("debe paginar resultados correctamente", () => {
  const data = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
  const helper = new SessionQueryHelper(data);

  const page1 = helper.paginate(1, 10);
  expect(page1.data).toHaveLength(10);
  expect(page1.data[0].id).toBe(1);

  const page2 = helper.paginate(2, 10);
  expect(page2.data[0].id).toBe(11);
});
```

### Scenario 2: Filtrar por Estado

```typescript
it("debe filtrar por estado correctamente", () => {
  const data = [
    { id: 1, status: "COMPLETO" },
    { id: 2, status: "INCOMPLETO" },
    { id: 3, status: "COMPLETO" },
  ];
  const helper = new SessionQueryHelper(data);

  const filtered = helper.filter({ status: "COMPLETO" });
  expect(filtered.length).toBe(2);
});
```

### Scenario 3: Calcular Estadísticas

```typescript
it("debe calcular estadísticas correctamente", () => {
  const stats = new SessionStatsHelper([
    { workers: 10, present: 8, absent: 2 },
  ]);

  const result = stats.calculate();
  expect(result.attendance).toBe(0.8); // 80%
  expect(result.total).toBe(10);
});
```

---

## ✅ Validation Checklist

- [ ] Tests pasan localmente
  ```bash
  npm run test:api
  ```
- [ ] Coverage > 90%
  ```bash
  npm run test:api -- --coverage
  ```
- [ ] E2E tests pasan
  ```bash
  npm run test:apie2e
  ```
- [ ] No hay warnings en logs
- [ ] Database cleanup entre tests
- [ ] Mocks correctamente aislados

---

## 📚 Referencias

- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Overview global
- **[VALIDATION.md](../VALIDATION.md)** - Guía de validación
- **[QUICK_START.md](../QUICK_START.md)** - 5-minute overview
- **[INDEX.md](../INDEX.md)** - Navegación principal

---

## 🚀 Next Steps

1. **Performance Tests**: Benchmark de queries grandes
2. **Load Testing**: Stress test con muchos resultados
3. **Integration Tests**: Full workflows end-to-end
4. **Contract Testing**: Validación de DTOs

---

**Last Updated**: January 21, 2026
**Backend Testing Status**: ✅ 124 Tests - Complete
