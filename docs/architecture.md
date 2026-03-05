# Architecture

## Frontend (Feature-based)

- `app/*/page.tsx`:
  - Next.js routing entrypoint only.
  - Imports and renders feature module.
- `features/*`:
  - Feature implementation unit.
  - Example:
    - `features/today/today-page.tsx`
    - `features/tasks/tasks-page.tsx`
    - `features/stats/stats-page.tsx`
    - `features/settings/settings-page.tsx`

### Rule

- New UI logic/state should be added under `features/<feature-name>/`.
- `app/` layer should not include feature logic.

## Backend (Clean + DI)

- `internal/usecase`:
  - Use-case layer (business rules).
  - Depends on `Repository` interface, not concrete DB implementation.
- `internal/api`:
  - gRPC handlers.
  - Input/output mapping and error mapping only.
- `internal/store/postgres`:
  - Infrastructure layer.
  - Implements repository methods with Postgres.
- `cmd/server/main.go`:
  - Composition root for dependency injection.
  - Wires `postgres.Store -> usecase.Service -> api.Server`.

### Rule

- Business logic goes to `usecase`.
- `api` should stay thin (transport concerns only).
- DB package should not be referenced directly by API handlers.

