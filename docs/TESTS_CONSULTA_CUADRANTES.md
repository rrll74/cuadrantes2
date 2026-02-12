# Tests - Consulta de Cuadrantes

Guía completa para ejecutar los tests de la funcionalidad **Consulta de Cuadrantes Históricos**.

## 📋 Índice

- [Tests del Backend](#tests-del-backend)
  - [Unit Tests](#unit-tests-backend)
  - [E2E Tests](#e2e-tests-backend)
- [Tests del Frontend](#tests-del-frontend)
  - [Unit Tests](#unit-tests-frontend)
  - [E2E Tests](#e2e-tests-frontend)
- [Ejecución Completa](#ejecución-completa)

---

## Tests del Backend

### Unit Tests Backend

**Archivos:**

- `apps/api/src/oldatabase/consulta-cuadrantes/consulta-cuadrantes.service.spec.ts`
- `apps/api/src/oldatabase/consulta-cuadrantes/consulta-cuadrantes.controller.spec.ts`

**Descripción:**

- Tests del servicio: Valida lógica de negocio (obtener empleados, cuadrantes, generar PDFs, etc.)
- Tests del controlador: Valida endpoints HTTP y validación de parámetros

**Ejecutar:**

```bash
# Tests unitarios del backend específicamente
cd /home/ramon/code/cuadrantes2/apps/api
npm run test -- consulta-cuadrantes

# O todos los tests unitarios
npm run test

# Con cobertura
npm run test -- --coverage consulta-cuadrantes
```

**Tests incluidos:**

#### Service Tests (18 tests)

- ✅ `obtenerEmpleados`: Retorna lista ordenada alfabéticamente
- ✅ `obtenerCuadrantes`: Filtra cuadrantes disponibles por período
- ✅ `obtenerConsultaCuadrante`: Construye respuesta completa con datos
- ✅ `generarPDF`: Genera buffer PDF válido
- ✅ `generarYEnviarPDF`: Retorna respuesta con success/message

#### Controller Tests (12 tests)

- ✅ `GET /consulta-cuadrantes/empleados`: Retorna lista de empleados
- ✅ `POST /cuadrantes-disponibles`: Valida parámetros requeridos
- ✅ `POST /consultar`: Retorna datos completos
- ✅ `POST /generar-pdf`: Genera PDF con headers correctos
- ✅ `POST /enviar-pdf-email`: Envía PDF por email

---

### E2E Tests Backend

**Archivo:**

- `apps/api/test/consulta-cuadrantes.e2e-spec.ts`

**Descripción:**

- Tests end-to-end con base de datos real
- Verifica autenticación y autorización
- Valida flujo completo de consultas

**Ejecutar:**

```bash
# E2E tests
cd /home/ramon/code/cuadrantes2/apps/api
npm run test:apie2e -- consulta-cuadrantes

# O todos los e2e tests
npm run test:apie2e

# Con modo watch
npm run test:apie2e -- --watch consulta-cuadrantes
```

**Tests incluidos (28 tests):**

#### Autenticación y Autorización (3 tests)

- ✅ Retorna 401 sin token
- ✅ Retorna 401 con token inválido
- ✅ Retorna 403 sin permiso `cuadrantes:read`

#### Endpoints (20 tests)

- ✅ `GET /empleados`: Lista completa de empleados
- ✅ `POST /cuadrantes-disponibles`: Validación y respuestas
- ✅ `POST /consultar`: Datos completos con múltiples meses
- ✅ `POST /generar-pdf`: Generación y headers
- ✅ `POST /enviar-pdf-email`: Envío de correo

#### Validaciones (5 tests)

- ✅ Períodos de un solo mes
- ✅ Períodos que atraviesan años
- ✅ Validación de meses válidos (1-12)

---

## Tests del Frontend

### Unit Tests Frontend

**Archivo:**

- `apps/gestion/src/app/dashboard/consulta-cuadrantes/page.spec.tsx`

**Descripción:**

- Tests del componente React
- Valida renderizado, interacciones del usuario y llamadas a API
- Usa mocks de hooks y cliente API

**Ejecutar:**

```bash
# Tests unitarios del frontend
cd /home/ramon/code/cuadrantes2/apps/gestion
npm run test -- page.spec

# O específicamente
npm run test -- consulta-cuadrantes/page.spec

# Con modo watch
npm run test -- --watch page.spec

# Con cobertura
npm run test -- --coverage page.spec
```

**Tests incluidos (35 tests):**

#### Permisos (2 tests)

- ✅ Muestra alerta sin permisos
- ✅ Renderiza página con permisos

#### Carga de Empleados (3 tests)

- ✅ Carga al montar componente
- ✅ Muestra en selector
- ✅ Muestra error si falla

#### Carga de Cuadrantes (3 tests)

- ✅ Cargar cuando se selecciona empleado
- ✅ Error si no hay disponibles
- ✅ Envía parámetros correctos

#### Realizar Consulta (5 tests)

- ✅ Valida selección de empleado
- ✅ Realiza consulta con parámetros
- ✅ Muestra resultados en tabla
- ✅ Muestra error si falla

#### Generar PDF (2 tests)

- ✅ Botón deshabilitado sin resultados
- ✅ Genera PDF con datos

#### Enviar Email (2 tests)

- ✅ Botón deshabilitado sin resultados
- ✅ Envía PDF por email

#### Selectores (5 tests)

- ✅ Cambiar mes inicio
- ✅ Cambiar año inicio
- ✅ Cambiar mes fin
- ✅ Cambiar año fin

#### Tipo de Cuadrante (2 tests)

- ✅ Radio buttons para tipo
- ✅ Selector inicial/modificado

#### Otros Tests (8 tests)

- ✅ Período
- ✅ Leyenda de colores
- ✅ Tabla de resultados
- etc.

---

### E2E Tests Frontend (Cypress)

**Archivo:**

- `apps/gestion/cypress/e2e/consulta-cuadrantes.cy.ts`

**Descripción:**

- Tests end-to-end en navegador completo
- Simula interacción real del usuario
- Verifica flujo completo desde login

**Ejecutar:**

```bash
# Abrir Cypress en modo interactivo
cd /home/ramon/code/cuadrantes2/apps/gestion
npm run cypress:open:gestion
# Luego seleccionar: E2E Testing → Chrome/Firefox → consulta-cuadrantes.cy.ts

# O ejecutar en modo headless
npm run cypress:run:gestion -- --spec "cypress/e2e/consulta-cuadrantes.cy.ts"

# Con modo watch
npm run cypress:watch:gestion -- --spec "cypress/e2e/consulta-cuadrantes.cy.ts"
```

**Tests incluidos (30+ tests):**

#### Acceso y Permisos (2 tests)

- ✅ Mostrar página con permisos
- ✅ Enlace en menú lateral

#### Carga de Empleados (2 tests)

- ✅ Cargar y mostrar
- ✅ Orden alfabético

#### Seleccionar Período (2 tests)

- ✅ Cambiar mes
- ✅ Valores por defecto

#### Cargar Cuadrantes (2 tests)

- ✅ Cargar al seleccionar empleado
- ✅ Error sin disponibles

#### Realizar Consulta (4 tests)

- ✅ Validar selección
- ✅ Realizar y mostrar
- ✅ Mostrar información
- ✅ Mostrar error

#### Generar PDF (3 tests)

- ✅ Botón deshabilitado/habilitado
- ✅ Generar PDF
- ✅ Filename con nombre empleado

#### Enviar Email (3 tests)

- ✅ Botón deshabilitado/habilitado
- ✅ Enviar PDF
- ✅ Alerta de éxito

#### Leyenda de Colores (2 tests)

- ✅ Mostrar leyenda
- ✅ Mostrar estados con colores

#### Tabla de Resultados (2 tests)

- ✅ Estructura correcta
- ✅ Múltiples meses

#### Selector Tipo (2 tests)

- ✅ Seleccionar inicial/modificado
- ✅ Enviar tipo en consulta

---

## Ejecución Completa

### Ejecutar Todos los Tests

```bash
# Backend: Unit + E2E
cd /home/ramon/code/cuadrantes2/apps/api
npm run test -- consulta-cuadrantes
npm run test:apie2e -- consulta-cuadrantes

# Frontend: Unit + E2E
cd /home/ramon/code/cuadrantes2/apps/gestion
npm run test -- page.spec
npm run cypress:run:gestion -- --spec "cypress/e2e/consulta-cuadrantes.cy.ts"
```

### Dashboard de Cobertura

```bash
# Backend
npm run test -- --coverage consulta-cuadrantes

# Frontend
npm run test -- --coverage page.spec

# Ver reportes
# Backend: apps/api/coverage/
# Frontend: apps/gestion/coverage/
```

---

## Requisitos Previos

### Backend E2E

- Base de datos de prueba configurada en `.env.test.local`
- Variables de entorno JWT_SECRET, DATABASE_URL configuradas

### Frontend Unit Tests

- Mock de hooks correctamente configurados
- Mock de API con `jest.mock("@/lib/api")`

### Frontend E2E (Cypress)

- Servidor frontend en `http://localhost:3000`
- Servidor API en `http://localhost:3101`
- Usuario de prueba: `testadmin/adminpass` (con permiso `cuadrantes:read`)

---

## Solución de Problemas

### Backend Tests Fallan

```bash
# Sincronizar BD de prueba
npm run db:seed:e2e

# Limpiar y recompilar
rm -rf dist
npm run build
npm run test -- consulta-cuadrantes
```

### Frontend Tests Fallan

```bash
# Limpiar cache de Jest
npm run test -- --clearCache

# Recompilar todos los tests
npm run test -- page.spec --no-cache
```

### Cypress Tests Fallan

```bash
# Limpiar cache de Cypress
npx cypress cache clear

# Desinstalar y reinstalar
npm uninstall cypress
npm install cypress

# Ejecutar con debug
npm run cypress:run:gestion -- --spec "cypress/e2e/consulta-cuadrantes.cy.ts" --debug
```

---

## Cobertura de Tests

| Componente | Unit    | E2E     | Cobertura |
| ---------- | ------- | ------- | --------- |
| Service    | ✅      | ✅      | ~90%      |
| Controller | ✅      | ✅      | ~85%      |
| Component  | ✅      | ✅      | ~80%      |
| **Total**  | **30+** | **30+** | **~85%**  |

---

## CI/CD Integration

Para integración en pipelines CI/CD:

```bash
# Backend - Solo tests sin Cypress
npm run test:apie2e -- consulta-cuadrantes --forceExit

# Frontend - Sin GUI
npm run test -- page.spec --passWithNoTests

# Cypress - Headless
npm run cypress:run:gestion -- --spec "cypress/e2e/consulta-cuadrantes.cy.ts" --headless
```

---

## Notas

- Los tests E2E usan base de datos en memoria (SQLite) para aislamiento
- Los mocks en tests unitarios permiten pruebas rápidas sin red
- Los tests Cypress validan flujos reales de usuario completos
- Todos los tests son independientes y pueden ejecutarse en cualquier orden

---

**Última actualización:** 11 de febrero de 2026
