# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Three-tier app: **React/Vite** frontend (TypeScript), **Viaduct GraphQL** backend (Kotlin/Ktor), **Supabase PostgreSQL** database. All wired together with `mise` for local dev.

## Development Commands

```bash
# Full environment
mise install          # Install Java 21, Podman, Supabase CLI (first time only)
mise run dev          # Start everything: Podman + Supabase + backend + frontend
mise run stop         # Stop all services
mise run test         # Run backend tests (auto-starts Supabase containers)

# Granular startup (if not using mise run dev)
mise run deps-start   # Start Podman + Supabase only
mise run backend      # Start backend (requires deps-start first)
mise run frontend     # Start frontend only
```

```bash
# Frontend (from repo root)
npm run dev           # Dev server: http://localhost:5173
npm run build         # Production build
npm run lint          # ESLint
npm test              # Vitest unit tests
npm run test:coverage # With coverage report

# Backend (from backend/)
./gradlew run         # Start server: http://localhost:10000
./gradlew test        # All tests (auto-starts Supabase)
./gradlew test --tests "com.urbanmesh.resolvers.GroupResolverTest"  # Single test class
./gradlew test --tests "com.urbanmesh.resolvers.GroupResolverTest.createGroup succeeds"  # Single test

# Database
supabase start        # Start local Supabase (also done by mise run deps-start)
supabase db reset     # Wipe and re-apply all migrations
```

## Service Ports

| Service | Port / URL |
|---------|-----------|
| Frontend | http://localhost:5173 |
| Backend GraphQL | http://localhost:10000/graphql |
| Backend GraphiQL | http://localhost:10000/graphiql |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| Supabase PostgreSQL | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

## Architecture

### Request Flow

```
Frontend (React/Vite)
  → GraphQL request + Authorization: Bearer <JWT> + X-User-Id: <uuid>
    → Viaduct backend (Kotlin/Ktor) validates JWT, creates per-request Supabase client
      → Supabase PostgreSQL enforces RLS policies (group membership checks)
```

### Viaduct Resolver Pattern

The backend uses Viaduct, which generates base resolver classes from `.graphqls` schema files. Resolvers extend these generated classes:

```kotlin
class CreateGroupResolver(private val groupService: GroupService) :
    MutationResolvers.CreateGroup() {
    override suspend fun resolve(ctx: Context, input: CreateGroupInput): Group {
        // ctx.userId is available for the authenticated user
    }
}
```

- Schema files live in `backend/src/main/viaduct/schema/*.graphqls`
- Resolvers live in `backend/src/main/kotlin/com/urbanmesh/resolvers/`
- Services (business logic) live in `backend/src/main/kotlin/com/urbanmesh/services/`
- **Always use the examples** in `backend/src/main/kotlin/com/viaduct/examples/` as templates when adding new resolvers

### GraphQL Schema Directives

```graphql
@scope(to: ["public"])   # No auth required (signIn, signUp, supabaseConfig)
@scope(to: ["default"])  # Authenticated users only
@scope(to: ["admin"])    # Admin users only
@idOf(type: "Group")     # Typed GlobalID — decode with input.groupId.internalID
@resolver               # Tells Viaduct to generate a base resolver class
```

Types implementing `Node` get GlobalIDs (Base64-encoded `TypeName:InternalID`). Encode: `ctx.globalIDFor(YourResource.Reflection, entity.id)`. Decode: `input.someId.internalID`.

### Access Control

- **Authentication**: JWT validated per request; public operations are `supabaseConfig`, `signIn`, `signUp`, `refreshToken`
- **Group-based RLS**: Database enforces access via `is_group_member(group_id)` and `is_admin()` functions in PostgreSQL RLS policies
- **Admin bypass**: `OR public.is_admin()` in RLS policies; first user to sign up becomes admin automatically

### Dependency Injection

Koin is used as a **standalone** DI container (not the Ktor plugin) so it survives CRaC checkpoints. Services are registered in the DI module and injected into resolvers.

### CRaC (Fast Startup)

Production uses Azul Zulu Warp for JVM checkpoint/restore (~368ms startup). Entry point is `CracMain.kt`. No code changes needed; handled transparently by the Docker image.

## Database Migrations

Migrations live in `schema/migrations/` (symlinked at `supabase/migrations/`). Applied automatically on `supabase start`/`supabase db reset` locally and on every Render deploy.

When adding a new resource:
1. Create a new timestamped `.sql` file in `schema/migrations/`
2. Include RLS policies following the pattern in existing migrations
3. Run `supabase db reset` to apply

See `docs/IMPLEMENTING_A_RESOURCE.md` for a complete walkthrough of adding a resource across all three layers.

## Frontend GraphQL Client

`src/lib/graphql.ts` handles GraphQL requests. It:
- Automatically attaches `Authorization` and `X-User-Id` headers
- Waits up to 1 second for Supabase session initialization before requests
- Reads the backend URL from `VITE_GRAPHQL_ENDPOINT` env var (auto-configured on Render)

## Further Documentation

- `docs/ARCHITECTURE.md` — CRaC warp, Podman, Supabase container details, troubleshooting
- `docs/IMPLEMENTING_A_RESOURCE.md` — Step-by-step: migrations → schema → resolver → frontend
- `docs/SETUP_GUIDE.md` — First-time Supabase and Render deployment setup
