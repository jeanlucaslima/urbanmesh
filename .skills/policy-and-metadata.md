# Policy and execution metadata

> **Future-phase guidance.** Do not implement unless a PRD explicitly
> asks for it. This file describes the *target* behavior, not current code.

## Status

Not implemented. Active PRD chain is at PRD C (docs). Policy and metadata
land in PRD D.

If you find yourself reaching for this file during PRDs A–C, stop. You are
about to pull future work forward — re-read `.skills/prd-implementation.md`.

## Target rules (for PRD D, not now)

### Policy

- Sensitive fields call `policy-service` before exposing values.
- A "policy decision" includes: `field`, `decision` (allow/deny),
  `reason`, `actorRole`.
- A denied field returns `null` or a documented safe fallback —
  never an unhandled error.
- Roles in scope: `AI_ASSISTANT`, `SUPPORT_AGENT`, `FINANCE_AGENT`,
  `ADMIN`.

Initial sensitive-field set (subject to PRD D):

```
BillingAccount.balance        (high-risk financial)
BillingAccount.paymentRisk    (high-risk financial)
SupportSummary.escalationStatus  (internal triage)
UsageSummary.monthlyEvents    (commercial sensitivity)
Customer.riskLevel            (derived internal score)
```

### Execution metadata

The response should expose:

```graphql
executionMetadata {
  servicesTouched     # which internal services were called
  blockedFields       # paths blocked by policy + reason
  policyDecisions {
    field
    decision          # ALLOW / DENY
    reason
    actorRole
  }
}
```

Ownership for these fields goes in `.skills/graphql-schema-ownership.md`
when PRD D lands.

### Demo line this supports

> "A slow query needs a path to a name."

Metadata is what makes the graph explainable. The agent and the human
operator see the same explanation.

## Don'ts (for now)

- Don't add a `policy-service` container.
- Don't add `executionMetadata`, `blockedFields`, `policyDecisions`, or
  `servicesTouched` to the schema.
- Don't add `actorRole` arguments to existing resolvers.
- Don't write placeholder resolvers that "will be filled in later".
