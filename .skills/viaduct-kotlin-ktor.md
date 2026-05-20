# Viaduct + Kotlin + Ktor in this repo

> How this project actually uses Viaduct. For framework mechanics (mutations,
> connections, batching, scopes), read the relevant `.viaduct/agents/` doc.

## Layout

```
viaduct-server/
├── build.gradle.kts          Ktor + Viaduct application plugin
├── settings.gradle.kts       includes :resolvers
├── gradle/
│   ├── wrapper/              gradle 9.1.0 pinned
│   └── viaduct.versions.toml versions catalog (viaduct, ktor, jackson, ...)
├── src/main/
│   ├── kotlin/com/example/viadapp/
│   │   ├── ViaductService.kt main()
│   │   ├── Plugins.kt        ContentNegotiation
│   │   └── Routing.kt        /health, /graphql, /graphiql
│   └── resources/
│       ├── application.yaml  port: 8080
│       └── logback.xml
└── resolvers/                tenant module (Viaduct module plugin)
    ├── build.gradle.kts
    └── src/main/
        ├── viaduct/schema/schema.graphqls
        └── kotlin/com/example/viadapp/resolvers/
            ├── customer/   Query.customer + Customer fields
            ├── billing/    Customer.billing
            ├── support/    Customer.support
            ├── usage/      Customer.usage
            └── internal/   shared HTTP client + service URLs
```

## Rules

- Ktor hosts HTTP routes only: `/health`, `/graphql`, `/graphiql`.
- Viaduct executes all GraphQL operations.
- Schema lives in `resolvers/src/main/viaduct/schema/schema.graphqls`.
- Fields that need application code use `@resolver`. The Viaduct Gradle
  plugin + KSP generate `XxxResolvers.Field()` base classes from the schema.
- Resolvers extend the generated base classes (e.g. `QueryResolvers.Customer()`,
  `CustomerResolvers.Billing()`) and are annotated with `@Resolver`.
- Do **not** write Apollo-style resolver maps. Do **not** introduce a
  separate GraphQL server library. Do **not** bypass Viaduct execution.

## Developer loop

1. Edit `resolvers/src/main/viaduct/schema/schema.graphqls`.
2. Add the field with `@resolver`.
3. Run a build so KSP regenerates the resolver base classes (the Docker
   `docker compose build viaduct-server` does this).
4. Implement the Kotlin resolver, extending the generated base class.
5. Run a GraphQL query via curl or GraphiQL.
6. Update `scripts/verify.sh` with a stage that proves the new field works.
7. Commit per the cadence skill.

## Parent-object access

For field resolvers that need the parent's fields, declare them with the
short `@Resolver("fieldName")` form and read via `ctx.getObjectValue().getX()`:

```kotlin
@Resolver("id")
class CustomerBillingResolver : CustomerResolvers.Billing() {
    override suspend fun resolve(ctx: Context): BillingAccount? {
        val customerId = ctx.getObjectValue().getId()
        // ...
    }
}
```

Kotlin property syntax (`ctx.objectValue.id`) does **not** work — the API
exposes Java-style getters and KSP-generated classes expect them.

## GRT construction

Build response objects with the generated GRT `of(ctx) { ... }` DSL:

```kotlin
return BillingAccount.of(ctx) {
    balance(theBalance)
    overdueInvoices(count)
    paymentRisk("HIGH")
}
```

## Dependencies

Versions live in `viaduct-server/gradle/viaduct.versions.toml`. If you add a
Jackson or coroutines dependency in the `resolvers` module, you'll need:

- `enforcedPlatform(libs.viaduct.bom)` (the BOM doesn't pin everything)
- explicit `jackson` version pin
- `kotlinx-coroutines-core` if you use `Dispatchers` / `withContext`

These were learned the hard way during PRD B. Don't repeat the discovery.

## Internal-service calls

Use `com.example.viadapp.resolvers.internal.InternalClient` and
`ServiceUrls` — they wrap JDK `HttpClient` + Jackson and read URLs from
env vars (`CUSTOMER_SERVICE_URL`, `BILLING_SERVICE_URL`,
`SUPPORT_SERVICE_URL`, `USAGE_SERVICE_URL`).

`InternalClient.getJson(url)` returns:

- `JsonNode` on 2xx
- `null` on 404 (so resolvers can return `null` cleanly)
- throws on 5xx
