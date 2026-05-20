# GraphQL schema ownership

> Every field has an obvious owner. No god resolvers.

## Why this matters

The talk's thesis is "one graph, owned slices". If a single class resolves
five domains, that thesis collapses. Preserve clarity even when it's
slightly less convenient.

## Ownership map

| Field                                    | Owner package                       |
| ---------------------------------------- | ----------------------------------- |
| `Query.customer`                         | `resolvers/customer/`               |
| `Customer.id` / `name` / `status` / `riskLevel` | `resolvers/customer/`        |
| `Customer.billing`                       | `resolvers/billing/`                |
| `BillingAccount.*`                       | `resolvers/billing/`                |
| `Customer.support`                       | `resolvers/support/`                |
| `SupportSummary.*`                       | `resolvers/support/`                |
| `Customer.usage`                         | `resolvers/usage/`                  |
| `UsageSummary.*`                         | `resolvers/usage/`                  |
| Shared HTTP / service URLs               | `resolvers/internal/`               |

When PRDs add policy and metadata:

| Field (future)                           | Owner package (future)              |
| ---------------------------------------- | ----------------------------------- |
| `Customer.executionMetadata` (or wherever it lands) | `resolvers/metadata/`    |
| Policy enforcement helpers               | `resolvers/policy/` or shared util  |

## Rules

- One resolver class per field — not one class per domain wrapping many fields.
- A resolver may only build types it owns. The `Customer.billing` resolver
  returns `BillingAccount`; it does not also build `SupportSummary`.
- Cross-domain composition happens **through the graph**, not by one resolver
  reaching across packages.
- Schema lives in **one** `schema.graphqls` for now (single tenant module),
  but the schema text should be grouped by domain with comments so ownership
  is visible at a glance.

## Don'ts

- Don't fan out to multiple internal services from a single resolver to
  "save a roundtrip". Use a `@Resolver("id")` field resolver per domain.
- Don't put HTTP fetch logic inline in five places. Use `InternalClient`.
- Don't add a "common" resolver class that handles multiple domain fields.
