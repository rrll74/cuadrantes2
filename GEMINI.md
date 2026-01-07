# Reglas del Proyecto: Monorepo NestJS & NextJS

## 1. Estructura del Espacio de Trabajo

- **Backend**: Ubicado en `./apps/api` (NestJS).
- **Frontend**: Ubicado en `./apps/gestion` (NextJS).
- **Shared**: No dupliques DTOs o tipos; busca primero en `./packages/shared-dto` si existe.

## 2. Estándares de Backend (NestJS)

- **Patrón**: Usa siempre la arquitectura de Módulos, Controladores y Servicios.
- **Validación**: Usa `class-validator` y `class-transformer` en todos los DTOs.
- **Inyección**: Asegúrate de que los nuevos servicios se registren en su `module.ts` correspondiente.
- **Base de Datos**: Si usas un ORM (TypeORM/Prisma), genera siempre una migración antes de modificar el esquema.

## 3. Estándares de Frontend (NextJS)

- **App Router**: Usa la estructura de `app/` (Server Components por defecto).
- **Componentes**: Crea componentes de UI en `components/ui` y componentes de página en la carpeta del segmento.
- **Client Components**: Solo usa `'use client'` cuando sea estrictamente necesario (interactividad, hooks de estado).
- **Estilos**: Usa Tailwind CSS siguiendo la configuración del proyecto.

## 4. Comportamiento del Agente (Autonomía)

- **Análisis**: Antes de crear un nuevo endpoint, verifica si el servicio de NestJS ya tiene una lógica similar.
- **Sincronización**: Al modificar una respuesta en el Backend, propón inmediatamente la actualización del tipo/interface en el Frontend.
- **Confirmación**: Pide permiso antes de ejecutar `npm install` o modificar archivos de configuración de Docker/Infraestructura.

## 5. Integración de Datos (TypeORM & React Query)

### Backend: TypeORM

- **Entidades**: Define siempre las relaciones (`@OneToMany`, `@ManyToOne`) de forma explícita en las entidades de NestJS.
- **Naming**: Usa `camelCase` para los nombres de las columnas y `snake_case` para el nombre de las tablas en la base de datos (si aplica).
- **Repositores**: Prefiere el uso del `Repository Pattern` inyectado en los servicios.
- **Transacciones**: Si una operación afecta a múltiples tablas, usa `QueryRunner` o el decorador de transacciones para asegurar la integridad.

### Frontend: React Query (TanStack Query)

- **Hooks Personalizados**: No llames a `useQuery` directamente en los componentes. Crea hooks personalizados en una carpeta `hooks/queries` o `hooks/mutations`.
- **Query Keys**: Organiza las llaves de caché de forma centralizada (ej. un objeto `queryKeys` constante) para evitar errores de invalidación.
- **Mutaciones**: Usa `onSuccess` para invalidar las queries relacionadas después de un POST, PATCH o DELETE, asegurando que la UI se actualice automáticamente.
- **Tipado**: Asegúrate de que el tipo de dato devuelto por la función de `fetch` coincida con el DTO definido en el Backend.

## 6. Flujo de Trabajo Recomendado

- Cuando se cree una nueva funcionalidad:
  1. Definir la **Entidad TypeORM**.
  2. Crear el **Servicio y Controlador** en NestJS.
  3. Crear el **Hook de React Query** en NextJS que consuma ese nuevo endpoint.
  4. Implementar el componente de UI.
