# 🎯 Cuadrantes2 - Monorepo de Scheduling

**Sistema de gestión de jornadas y asignación de trabajadores a rutas**

---

## 📋 Índice Rápido

- [Tecnologías](#-tecnologías)
- [Estructura](#-estructura-del-proyecto)
- [Instalación y Desarrollo](#-instalación-y-desarrollo)
- [Testing](#-testing)
- [Documentación](#-documentación)
- [API y Base de Datos](#-api-y-base-de-datos)

---

## 🛠️ Tecnologías

### Versiones Críticas

| Tecnología  | Versión        | Propósito            |
| ----------- | -------------- | -------------------- |
| **Node.js** | v20.16.0 (LTS) | Runtime              |
| **npm**     | 10.8.1         | Package manager      |
| **nvm**     | 0.39.0         | Node version manager |
| **MariaDB** | 10.6.22        | Base de datos        |

### Stack Principal

| Capa         | Framework                 | Versión |
| ------------ | ------------------------- | ------- |
| **Backend**  | NestJS                    | 11      |
| **Frontend** | Next.js                   | 14+     |
| **ORM**      | TypeORM                   | 0.3     |
| **Auth**     | JWT + Passport            | -       |
| **Styling**  | TailwindCSS + Material-UI | -       |
| **Testing**  | Jest + Cypress            | -       |

---

## 📁 Estructura del Proyecto

```
cuadrantes2/ (Monorepo - npm workspaces)
├── apps/
│   ├── api/                 # 🔌 NestJS Backend
│   │   ├── src/
│   │   │   ├── newdatabase/    # Entities y servicios actuales
│   │   │   ├── auth/           # Autenticación JWT
│   │   │   └── oldatabase/     # Legacy (siendo migrado)
│   │   └── test/               # Tests E2E
│   │
│   └── gestion/             # 🎨 Next.js Frontend
│       ├── src/
│       │   ├── app/            # App Router (Next.js)
│       │   ├── components/      # Componentes React
│       │   ├── features/        # Lógica por feature (jornadas, etc)
│       │   ├── hooks/           # Custom hooks
│       │   ├── context/         # React Context
│       │   └── lib/             # Utilidades y API client
│       ├── cypress/            # Tests E2E
│       └── public/             # Static files
│
├── packages/
│   └── shared-dto/          # 📦 Tipos compartidos TypeScript
│       └── src/             # DTOs reutilizables
│
├── docs/                    # 📚 Documentación
│   ├── testing/             # Documentación de tests (323+ tests)
│   │   ├── backend/         # Backend tests
│   │   └── frontend/        # Frontend tests
│   └── architecture/        # Decisiones técnicas
│
└── scripts/                 # 🔧 Scripts de utilidad
```

---

## 🚀 Instalación y Desarrollo

### Requisitos Previos

```bash
nvm install 20.16.0
nvm use 20.16.0
npm install -g npm@10.8.1
```

### Instalación del Proyecto

```bash
# Clonar y instalar dependencias
npm install

# Ver workspaces disponibles
npm workspaces list
```

### Desarrollo

```bash
# Ejecutar todo (API + Frontend + Shared)
npm run dev

# Solo backend
npm run dev:api

# Solo frontend
npm run dev:gestion

# Compartido en watch mode
npm run dev:shared
```

### Build Producción

```bash
# Build completo
npm run build

# Build individual
npm run build:api
npm run build:gestion
```

---

## 🧪 Testing

### Overview de Tests

- **Backend**: 124 tests (helpers + services + e2e)
- **Frontend**: 160+ tests (components + hooks + e2e)
- **E2E**: 39 tests (Cypress)
- **Total**: 323+ tests

Para documentación completa: **[docs/testing/INDEX.md](./docs/testing/INDEX.md)**

### Comandos Rápidos

```bash
# Backend
npm run test:api              # Unit tests
npm run test:apie2e           # E2E con SQLite
npm run test:api -- --coverage

# Frontend
npm run test:gestion          # Unit tests
npm run test:gestion -- --coverage
npm run cypress:open:gestion  # E2E interactivo
npm run cypress:run:gestion   # E2E headless

# Storybook
npm run storybook:gestion
```

### Documentación de Testing

👉 **[Guía Completa de Testing](./docs/testing/INDEX.md)**

- 📊 [Architecture Overview](./docs/testing/ARCHITECTURE.md) - Overview global
- 🚀 [Quick Start (5 min)](./docs/testing/QUICK_START.md) - Comienza aquí
- ✅ [Validation Guide](./docs/testing/VALIDATION.md) - Validar tests
- 🔬 [Backend Testing](./docs/testing/backend/README.md) - 124 tests
- 🎨 [Frontend Testing](./docs/testing/frontend/README.md) - 160+ tests

---

## 📚 Documentación

### Documentación de Arquitectura

Decisiones técnicas y refactorizaciones: **[docs/architecture/](./docs/architecture/)**

- [REFACTORING_JORNADAS_QUERY_SERVICE.md](./docs/architecture/REFACTORING_JORNADAS_QUERY_SERVICE.md) - Refactorización del servicio
- [RESUMEN_REFACTORING.md](./docs/architecture/RESUMEN_REFACTORING.md) - Resumen de cambios

### Ayuda Inicial

Para preguntas sobre la creación del proyecto: **[ayuda_pedida/](./ayuda_pedida/)**

---

## 🔌 API y Base de Datos

### Documentación de la API

Accesible en el endpoint `/api-docs` del servidor:

👉 **[API Swagger](http://localhost:3101/api-docs#/)**

(Requiere que el servidor esté corriendo en el puerto 3101)

### Configuración de Base de Datos

#### Desarrollo

```bash
# MariaDB en Docker
docker-compose -f scripts/docker-compose-mariadb.yaml up -d

# Variables en .env.development.local
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=password
DATABASE_NAME=cuadrantes2
```

#### Testing

- Backend E2E: SQLite en memoria (`:memory:`)
- Frontend E2E: Mock de API con Cypress intercepts

#### Producción

- MariaDB remoto
- Ver `scripts/docker-compose.prod.yml`

---

## 🔐 Autenticación y Permisos

### JWT Token

```typescript
// Almacenado en localStorage
localStorage.setItem("token", jwtToken);

// Headers automáticos via API client
Authorization: Bearer<token>;
```

### Permisos (Roles)

Guardados en tabla `Permiso` con tipos como:

- `admin` - Acceso total
- `users:read` - Lectura de usuarios
- `jornadas:write` - Crear/editar jornadas
- `jornadas:read` - Solo lectura

---

## 📦 Workspaces (npm)

El proyecto usa **npm workspaces**:

```bash
# Instalar en workspace específico
npm install --workspace=apps/api package-name

# Ejecutar script en workspace
npm run test --workspace=apps/api
```

### Workspaces del Proyecto

1. **apps/api** - Backend NestJS
2. **apps/gestion** - Frontend Next.js
3. **packages/shared-dto** - DTOs compartidos

---

## 🐳 Docker

### Imágenes Disponibles

```bash
# Dockerfile para API
docker build -f apps/api/Dockerfile -t cuadrantes-api:latest .

# Dockerfile para Frontend
docker build -f apps/gestion/Dockerfile -t cuadrantes-gestion:latest .

# Stack con MariaDB
docker-compose -f scripts/docker-compose.prod.yml up -d
```

---

## 🔧 Configuración

### Archivos de Ejemplo

Ver `.example.env` files en cada directorio:

```bash
# Backend
apps/api/example.env.development.local
apps/api/example.env.test.local
apps/api/example.env.production.local

# Frontend
apps/gestion/example.env.production.local
```

### Variables Críticas

| Variable       | Propósito                   |
| -------------- | --------------------------- |
| `JWT_SECRET`   | Firma de tokens             |
| `DATABASE_*`   | Conexión MariaDB            |
| `NODE_ENV`     | development/test/production |
| `NEXTAUTH_URL` | URL de autenticación        |

---

---

## 📞 Contacto y Ayuda

### Estructura de Ayuda

- **Preguntas sobre creación**: [ayuda_pedida/](./ayuda_pedida/)
- **Problemas técnicos**: Revisar [docs/architecture/](./docs/architecture/)
- **Testing**: Ir a [docs/testing/INDEX.md](./docs/testing/INDEX.md)

---

## 📋 Pasos Iniciales

### Para Desarrollo

1. Instalar: `npm install`
2. Copiar archivos `.env`: Basarse en `example.env.*.local`
3. Iniciar MariaDB: `docker-compose -f scripts/docker-compose-mariadb.yaml up -d`
4. Iniciar desarrollo: `npm run dev`
5. Acceder frontend: `http://localhost:3000`
6. Acceder backend: `http://localhost:3101`

### Para Testing

1. Revisar: [docs/testing/QUICK_START.md](./docs/testing/QUICK_START.md)
2. Ejecutar: `npm run test:api && npm run test:gestion`
3. Ver coverage: `npm run test:api -- --coverage`

### Para Deployment

1. Build: `npm run build`
2. Ver: `scripts/docker-compose.prod.yml`
3. Configurar env de producción

---

## 🎓 Convenciones del Proyecto

### Nomenclatura

- **Componentes**: PascalCase (ej: `JornadasDetailTable.tsx`)
- **Hooks**: camelCase con prefijo `use` (ej: `useResultsTable.ts`)
- **Servicios**: camelCase con sufijo `.service.ts` (ej: `jornadas-query.service.ts`)
- **Helpers**: camelCase con sufijo `.helper.ts` (ej: `session-query.helper.ts`)
- **Tests**: Mismo nombre del archivo con `.spec.ts(x)` (ej: `Icon.spec.tsx`)

### Estructura de Carpetas

```
feature/
├── services/         # Servicios NestJS
├── controllers/      # Controllers NestJS
├── entities/         # TypeORM entities
├── dto/             # Data Transfer Objects
├── helpers/         # Helpers puros
└── [feature].module.ts
```

### Tipos y DTOs

- Compartidos en `packages/shared-dto/src/`
- Reutilizar entre backend y frontend
- Usar `class-validator` decorators

### Git y Commits

- Main branch: `main` (production-ready)
- Development: Usar branches feature
- Mensaje: `[feature/fix]: Descripción corta`

---

## 📊 Estadísticas del Proyecto

| Métrica                     | Valor  |
| --------------------------- | ------ |
| **Tests Totales**           | 323+   |
| **Líneas de Documentación** | 3,449+ |
| **Componentes Frontend**    | 50+    |
| **Servicios Backend**       | 15+    |
| **Custom Hooks**            | 8+     |
| **Helpers Backend**         | 7+     |

---

## 🔗 Enlaces Rápidos

| Recurso               | Ubicación                                                        |
| --------------------- | ---------------------------------------------------------------- |
| Testing Documentation | [docs/testing/INDEX.md](./docs/testing/INDEX.md)                 |
| Architecture          | [docs/architecture/INDEX.md](./docs/architecture/INDEX.md)       |
| API Docs              | [http://localhost:3101/api-docs](http://localhost:3101/api-docs) |
| Storybook             | Ejecutar `npm run storybook:gestion`                             |
| Cypress Dashboard     | Ejecutar `npm run cypress:open:gestion`                          |

---

## ⚠️ Gotchas Importantes

1. **Database Connection**: Named connection `'new'` en TypeORM (legacy `'old'` en migración)
2. **Circular Dependencies**: Usar `forwardRef()` en módulos (ej: auth.module.ts)
3. **E2E Tests**: Usan SQLite en memoria, no MariaDB
4. **Frontend Styling**: Material-UI + TailwindCSS (revisar ambos)
5. **Monorepo**: `npm install` en root para todos los workspaces

---

## 📝 Cambios Históricos

Para decisiones de arquitectura y refactorizaciones pasadas:

👉 **[docs/architecture/](./docs/architecture/)** - Historial de cambios técnicos
