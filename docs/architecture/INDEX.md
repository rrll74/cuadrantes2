# 🏗️ Architecture Documentation

**Decisiones técnicas, refactorizaciones y diseño del sistema**

---

## 📋 Documentos

### 1. [REFACTORING_JORNADAS_QUERY_SERVICE.md](./REFACTORING_JORNADAS_QUERY_SERVICE.md)

**Tema**: Refactorización del servicio `jornadas-query.service.ts`

**Contenido**:

- Estructura creada: División en 7 helpers especializados
- Archivos generados (types, session-query, session-stats, etc.)
- Métodos por helper y responsabilidades
- Inyecciones de dependencias
- Ventajas de la modularización

**Cuándo leer**:

- Al trabajar con la lógica de jornadas
- Para entender por qué existe `query-helpers/`
- Al agregar nuevos helpers

**Líneas**: 222

---

### 2. [RESUMEN_REFACTORING.md](./RESUMEN_REFACTORING.md)

**Tema**: Resumen ejecutivo de la refactorización

**Contenido**:

- Estadísticas (antes/después)
- Estructura de carpeta visual
- Contenido de cada helper
- Métodos clave
- Arquitectura de módulo

**Cuándo leer**:

- Para una visión rápida de los cambios
- Como referencia de decisiones de diseño
- Antes de leer el documento completo

**Líneas**: 183

---

## 🎯 Guía Rápida

### Servicio de Jornadas (Query)

**Ubicación**: `apps/api/src/newdatabase/jornadas/services/`

**Estructura**:

```
services/
├── query-helpers/              # Helpers especializados
│   ├── types.ts               # Interfaces compartidas
│   ├── session-query.helper.ts
│   ├── session-stats.helper.ts
│   ├── jornadas-table.helper.ts
│   ├── jornadas-service-summary.helper.ts
│   ├── jornadas-worker-summary.helper.ts
│   └── jornadas-status-summary.helper.ts
└── jornadas-query.service.ts   # Orquestador (SRP)
```

**Por qué**: Cada helper tiene una única responsabilidad (SRP)

**Ventajas**:

- ✅ Más fácil de testear (helpers puros)
- ✅ Mejor mantenibilidad
- ✅ Reutilizable en otros servicios
- ✅ Cambios aislados por feature

---

## 📚 Referencias

- **Testing**: [docs/testing/](../testing/)
- **Backend Code**: [apps/api/src/](../../../apps/api/src/)
- **Frontend Code**: [apps/gestion/src/](../../../apps/gestion/src/)

---

## 🔍 Búsqueda de Información

| Pregunta                         | Documento                                    |
| -------------------------------- | -------------------------------------------- |
| ¿Por qué existen tantos helpers? | RESUMEN_REFACTORING.md (Estadísticas)        |
| ¿Cuál es la estructura exacta?   | REFACTORING_JORNADAS_QUERY_SERVICE.md        |
| ¿Qué métodos tiene cada helper?  | REFACTORING_JORNADAS_QUERY_SERVICE.md        |
| ¿Cómo testear los helpers?       | [docs/testing/backend/](../testing/backend/) |

---

## 💡 Decisiones Clave

### 1. Modularización en Helpers

**Decisión**: Dividir `jornadas-query.service.ts` (927 líneas) en 7 helpers

**Razonamiento**:

- Cada helper = Una responsabilidad
- Más testeable unitariamente
- Métodos más pequeños = Menos complejidad
- Reutilizable en otros contextos

**Resultado**:

- 8 archivos (antes: 1)
- 1-2 métodos por archivo (antes: 8)
- Mejor separación de concerns

---

## 🚀 Próximas Refactorizaciones

Documentar otras decisiones arquitectónicas importantes aquí:

- [ ] Refactoring de `jornadas-matcher.service.ts`
- [ ] Refactoring de `jornadas-import.service.ts`
- [ ] Refactoring de módulo de Auth
- [ ] Refactoring de Frontend (si aplica)

---

**Last Updated**: January 21, 2026
**Version**: 1.0
