# 001 — Viaduct: Adding Public Queries for SF Open Data

## What we did

Added the first real domain module to UrbanMesh — live San Francisco civic data
(building permits and 311 service cases) — using Viaduct's schema-first workflow.

## Viaduct workflow followed

### 1. Define the schema

Created `backend/src/main/viaduct/schema/SFData.graphqls` with new types, input
types, and queries.

Two directives do the heavy lifting:

- `@scope(to: ["public"])` — marks types and queries as accessible without a JWT.
  Applied to the `extend type Query` block and all new types.
- `@resolver` — tells Viaduct's code generator to produce an abstract base class
  for that query field.

```graphql
extend type Query @scope(to: ["public"]) {
  buildingPermits(filter: BuildingPermitFilter, pagination: PaginationInput): [BuildingPermit!]! @resolver
  buildingPermit(permitNumber: String!): BuildingPermit @resolver
  serviceCases(filter: ServiceCaseFilter, pagination: PaginationInput): [ServiceCase!]! @resolver
  permitSummary(groupBy: String!): [PermitSummary!]! @resolver
}
```

### 2. Run the code generator

```bash
./gradlew build -x test
```

Viaduct's annotation processor generates:

- **Resolver base classes** — `QueryResolvers.BuildingPermits`, `QueryResolvers.BuildingPermit`,
  `QueryResolvers.ServiceCases`, `QueryResolvers.PermitSummary`
- **GRT builder classes** — `BuildingPermit.Builder(ctx)`, `ServiceCase.Builder(ctx)`,
  `PermitSummary.Builder(ctx)` — typed builders for constructing return values field by field

### 3. Implement the resolvers

Each resolver:

- Is annotated with `@Resolver`
- Extends the generated base (e.g. `QueryResolvers.BuildingPermits()`)
- Overrides `suspend fun resolve(ctx: Context)`
- Reads typed arguments from `ctx.arguments` (e.g. `ctx.arguments.filter`, `ctx.arguments.pagination`)
- Returns GRT instances via the generated builder pattern

```kotlin
@Resolver
class BuildingPermitsQueryResolver(private val sfDataService: SFDataService) :
    QueryResolvers.BuildingPermits() {

    override suspend fun resolve(ctx: Context): List<BuildingPermit> {
        val filter = ctx.arguments.filter?.let { f ->
            PermitFilter(neighborhood = f.neighborhood, status = f.status, ...)
        }
        return sfDataService.getPermits(filter, limit, offset).map { dto ->
            BuildingPermit.Builder(ctx)
                .permitNumber(dto.permitNumber ?: "")
                .neighborhood(dto.neighborhood)
                // ...
                .build()
        }
    }
}
```

### 4. Register in Koin

```kotlin
singleOf(::SFDataService)
singleOf(::BuildingPermitsQueryResolver)
singleOf(::BuildingPermitQueryResolver)
singleOf(::ServiceCasesQueryResolver)
singleOf(::PermitSummaryQueryResolver)
```

### 5. Wire up the auth plugin

`@scope(to: ["public"])` is the schema-level declaration; `AuthenticationPlugin.kt`
is the runtime enforcement. The 4 query names were added to `PUBLIC_OPERATIONS` so
the JWT check is bypassed for them:

```kotlin
private val PUBLIC_OPERATIONS = setOf(
    "signIn", "signUp", "refreshToken", "supabaseConfig",
    "buildingPermits", "buildingPermit", "serviceCases", "permitSummary"
)
```

## Key pattern

Viaduct is schema-first. The correct order is always:

1. Write `.graphqls` — define types, directives, queries
2. Run `./gradlew build` — generate base classes and GRT builders
3. Implement resolvers — extend generated bases, use `ctx.arguments.*` and `*.Builder(ctx)`
4. Register in Koin — `singleOf(::MyResolver)`
5. Update auth plugin — add query names to `PUBLIC_OPERATIONS` if public

## Commit

`2cbe2e8` — Add SF Open Data module: building permits and 311 cases via SODA API
