# Cuadrantes2 Monorepo - AI Coding Assistant Guidelines

## Architecture Overview

**Cuadrantes2** is a monorepo (npm workspaces) with two main applications:

- **`apps/api`**: NestJS backend (TypeORM, JWT auth, Excel processing)
- **`apps/gestion`**: Next.js frontend (React, Material-UI, TailwindCSS)
- **`packages/shared-dto`**: Shared TypeScript DTOs for type safety across apps

### Data Flow

1. Frontend uploads Excel files → API endpoint in `jornadas` module
2. `JornadasImportService` parses Excel → validates → imports into DB
3. `JornadasMatchingService` matches workers with routes (complex business logic)
4. `JornadasExportService` generates Excel reports
5. `JornadasQueryService` handles pagination and filtering for frontend

## Tech Stack & Key Dependencies

- **Node.js**: v20.16.0 (LTS)
- **API**: NestJS 11, TypeORM 0.3, MariaDB, ExcelJS, Socket.io
- **Frontend**: Next.js 14+, React, Material-UI, TailwindCSS, Cypress
- **Auth**: JWT with Passport, bcrypt hashing, role-based access (permisos)
- **Testing**: Jest (API unit/e2e), Cypress (gestion e2e), Storybook (components)

## Critical Developer Workflows

### Development

```bash
npm run dev              # Runs API (watch) + frontend + shared-dto (watch)
npm run dev:api         # API only with watch
npm run dev:gestion     # Frontend only
```

### Building

```bash
npm run build           # Full production build (shared → api → gestion)
npm run build:api       # API: TypeScript → dist/
npm run build:gestion   # Frontend: Next.js build
```

### Testing

```bash
# API
npm run test:api              # Jest unit tests
npm run test:apie2e           # Build then run e2e with SQLite test DB
npm run db:seed:e2e          # Seed test database

# Frontend
npm run test:gestion          # Jest unit tests
npm run cypress:open:gestion  # Interactive Cypress runner
npm run storybook:gestion     # Component documentation & testing
```

**Important**: E2E tests use SQLite in-memory DB (see `test/e2e-setup.ts`), not production MariaDB. Seeding creates test admin/user with predefined permissions.

## Project-Specific Conventions & Patterns

### NestJS API Structure

- **Modules**: Feature-based (`jornadas/`, `users/`, `permisos/`, `auth/`)
- **Database Connection**: Named connection `'new'` for TypeORM (legacy `'old'` exists for migration)
- **Circular Dependencies**: Use `forwardRef()` (see `auth.module.ts` → UsersModule → StatusModule)
- **Config**: Environment files → `ConfigModule.forRoot()` with `NODE_ENV` (development/test/production)

### Authorization Pattern

- **Guards**: `JwtAuthGuard` validates JWT tokens
- **Decorators**: `@Public()` marks endpoints skipping auth (e.g., login, status)
- **Permissions**: Stored in `Permiso` entity, associated with `User` via many-to-many relation
- **Permission Types**: `admin`, `users:read/create/update/delete`, `jornadas:read/write`

### File Upload & Storage

- Handled via `MulterModule` in `jornadas.module.ts`
- Uploads saved to `project-root/uploads/` with timestamp-based unique names
- Directory auto-created if missing

### Jornadas (Shift Scheduling) Module

The core domain logic:

1. **Entities**: `ImportSession`, `ScheduledRoute`, `RawWorker`, `RawClockIn`, `PresenceResult`, `UnmatchedResult`
2. **Import Flow**: `JornadasImportService` → `JornadasParserService` (validates headers) → `JornadasMatchingService` (matches workers to routes)
3. **Matching Logic**: Converts to `post-process.helper.ts` utilities for complex business rules
4. **Export**: `JornadasExportService` generates Excel with results

### Shared DTOs

- Located in `packages/shared-dto/src/`
- Compiled to `dist/` with TypeScript declarations
- Imported as `@cuadrantes/shared-dto` in both apps
- Use `class-validator` decorators for API validation

### Frontend (Next.js/React)

- **App Router**: `src/app/` directory with nested routes
- **Context**: `AuthContext` for global auth state
- **API Calls**: Fetch/axios to backend on `localhost:3101` (or configured port)
- **Styling**: Material-UI + TailwindCSS (check both `src/theme.ts` and `globals.css`)
- **Testing**: Storybook for component isolation, Cypress for user flows

## Integration & Cross-Component Communication

### Database Transactions

- E2E tests spawn separate SQLite DB; always clean up after tests
- Production uses MariaDB on configured host/port
- TypeORM synchronize option auto-creates schema in dev/test

### Environment Configuration

- `apps/api/.env.development.local` / `.env.test.local` / `.env.production.local`
- `apps/gestion/.env.production.local`
- Root `.example.env` documents all required variables
- **Critical vars**: `JWT_SECRET`, `DATABASE_*`, `NODE_ENV`, port numbers

### WebSockets (Socket.io)

- Configured in `auth.module.ts` with namespace support
- Useful for real-time updates on file import progress

### Logging

- NestJS `Logger` service used throughout (see `JornadasService`)
- E2E tests output seeding status to console
- Check API logs for validation errors during import

## Common Tasks & Patterns

### Adding a New Feature

1. Create entity in `apps/api/src/newdatabase/[feature]/entities/`
2. Register in TypeORM module imports
3. Create service with business logic (use repository injections)
4. Create controller with decorated endpoints
5. Add DTOs in `packages/shared-dto/src/`
6. Update tests (unit in same folder, e2e in `test/`)
7. Frontend: consume API and build React components

### Debugging Failed Tests

- Check e2e logs: test DB path in `.env.test.local`
- Run `npm run db:seed:e2e` manually to inspect seeded data
- Use `--verbose` flag: `jest --verbose --config ./test/jest-e2e.config.js`

### Database Migration Patterns

- Old schema in `oldatabase/` (legacy, being phased out)
- New schema in `newdatabase/` (current development)
- TypeORM `synchronize: true` in dev/test auto-migrates schema
- For production: create explicit migration files

## Recommended Directories for Common Tasks

- **Core API logic**: [`apps/api/src/newdatabase/`](apps/api/src/newdatabase/)
- **Jornadas business logic**: [`apps/api/src/newdatabase/jornadas/services/`](apps/api/src/newdatabase/jornadas/services/) (especially `jornadas-matcher.service.ts`)
- **Auth & permissions**: [`apps/api/src/auth/`](apps/api/src/auth/)
- **Frontend pages**: [`apps/gestion/src/app/`](apps/gestion/src/app/)
- **Shared types**: [`packages/shared-dto/src/`](packages/shared-dto/src/)
- **E2E test setup**: [`apps/api/test/`](apps/api/test/)

## Gotchas & Important Notes

1. **Monorepo dependencies**: Running `npm install` at root updates all workspaces. When adding packages, use `npm install --workspace=apps/api`.
2. **Circular imports**: Watch for TypeScript path resolution conflicts. Use `@/` prefix (configured in `tsconfig.json`).
3. **Database connections**: Named connection `'new'` must be injected with `@InjectRepository(Entity, 'new')`.
4. **Jest config differences**: API uses `jest.config.js`, e2e uses `test/jest-e2e.config.js`, gestion uses its own in `apps/gestion/`.
5. **Excel file parsing**: ExcelJS used for parsing; always validate headers match expected schema (see `jornadas-parser.service.ts`).
6. **Docker**: Dockerfile present in both `apps/api/` and `apps/gestion/`; MariaDB Docker setup in `scripts/docker-compose-mariadb.yaml`.
