# 📚 Testing Documentation - Cuadrantes2

**Guía completa de testing para toda la aplicación (Backend + Frontend + E2E)**

---

## 🚀 Quick Navigation

### ⏱️ Apurado? (5 minutos)

- [Quick Start Guide](./QUICK_START.md) - Estado actual y pasos inmediatos

### 🔍 Necesitas validar tests? (10 minutos)

- [Validation Guide](./VALIDATION.md) - Instrucciones paso a paso

### 📖 Quieres entender la arquitectura? (15 minutos)

- [Architecture Overview](./ARCHITECTURE.md) - Visión global completa

---

## 📦 Testing por Layer

### Backend Testing (124 tests) ✅

**Ubicación**: `apps/api/test/` y `apps/api/src/`

→ [Backend Documentation](./backend/README.md)

- [Helpers & Services Coverage](./backend/COVERAGE.md)
- [E2E Tests](./backend/E2E.md)
- [Setup & Patterns](./backend/SETUP.md)

### Frontend Testing (~166 tests) 🆕

**Ubicación**: `apps/gestion/src/`

→ [Frontend Documentation](./frontend/README.md)

- [UI Components (58 tests)](./frontend/UI_COMPONENTS.md)
- [Custom Hooks (100+ tests)](./frontend/HOOKS.md)
- [Jornadas Components (51 tests)](./frontend/JORNADAS.md)
- [Validation Steps](./frontend/VALIDATION.md)

### E2E Testing (39 tests) ✅

**Ubicación**: `apps/gestion/cypress/e2e/`

Incluido en [Frontend Documentation](./frontend/README.md)

---

## 📊 Estadísticas Globales

```
Backend:       124 tests ✅
Frontend UI:    58 tests (22✅ + 36⚠️)
Frontend Hooks: 100+ tests (30✅ + 70⚠️)
E2E:            39 tests ✅
─────────────────────────────
TOTAL:         329+ tests
```

---

## ✅ Current Status

- ✅ **52 tests operativos** (Icon, useDebounce, usePermissions)
- ⚠️ **114 tests estructura lista** (UI Components, React Query Hooks)
- 📊 **166 total tests frontend creados**

---

## 🎯 Documento Recomendado Según Tu Necesidad

| Necesidad               | Documento                                                | Tiempo |
| ----------------------- | -------------------------------------------------------- | ------ |
| Ver estado actual       | [QUICK_START.md](./QUICK_START.md)                       | 5 min  |
| Validar & ajustar tests | [VALIDATION.md](./VALIDATION.md)                         | 10 min |
| Entender arquitectura   | [ARCHITECTURE.md](./ARCHITECTURE.md)                     | 15 min |
| Tests de backend        | [backend/README.md](./backend/README.md)                 | 10 min |
| Tests de UI             | [frontend/UI_COMPONENTS.md](./frontend/UI_COMPONENTS.md) | 20 min |
| Tests de hooks          | [frontend/HOOKS.md](./frontend/HOOKS.md)                 | 20 min |
| Tests de jornadas       | [frontend/JORNADAS.md](./frontend/JORNADAS.md)           | 15 min |

---

## 🗂️ Estructura Completa

```
docs/testing/
├── INDEX.md                        ← Estás aquí
├── QUICK_START.md
├── VALIDATION.md
├── ARCHITECTURE.md
│
├── backend/
│   ├── README.md
│   ├── COVERAGE.md
│   ├── E2E.md
│   └── SETUP.md
│
└── frontend/
    ├── README.md
    ├── UI_COMPONENTS.md
    ├── HOOKS.md
    ├── JORNADAS.md
    └── VALIDATION.md
```

---

## 🚀 Comandos Útiles

### Ver tests operativos

```bash
npm run test:gestion -- --testPathPattern="(Icon|useDebounce|usePermissions)"
```

### Ejecutar suite completa

```bash
npm run test:gestion -- --no-coverage
```

### Ver solo archivos de test

```bash
find apps -name "*.spec.ts*" | wc -l
```

---

## 📞 Need Help?

- **¿Por qué algunos tests no pasan?** → [QUICK_START.md](./QUICK_START.md)
- **¿Cómo corrijo los tests?** → [VALIDATION.md](./VALIDATION.md)
- **¿Qué patterns se usaron?** → [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Detalles técnicos?** → Layer-specific READMEs

---

**Last Updated**: January 21, 2026
**Version**: 1.0 - Reorganized Structure
