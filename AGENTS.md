# AGENTS.md

> Operating instructions for coding agents working in this repository.

## Project identity

This repo is the Viaduct-first demo for **Turning San Francisco Into a
GraphQL Server**.

The active implementation is **Ktor-hosted Viaduct**. The active GraphQL
server is `viaduct-server`.

The original Apollo prototype is archived under `prototype-apollo/`
**and must not be used for active development**. Treat that directory
as read-only history.

## Required reading order

Before writing any code in this repo, read in this order:

1. This file (`AGENTS.md`).
2. `.skills/project-architecture.md` — what is active vs archived.
3. `.skills/prd-implementation.md` — PRDs are scoped; don't pull features forward.
4. `.skills/commit-cadence.md` — commit at every milestone, not at the end.
5. `.skills/verification-qa.md` — `scripts/verify.sh` is the source of truth.
6. `.skills/viaduct-kotlin-ktor.md` — how Viaduct + Ktor work in this repo.
7. The relevant `viaduct-dev/skills` doc for the GraphQL pattern you're using
   (see the table below).

Domain/demo skills (consult when relevant):

- `.skills/graphql-schema-ownership.md`
- `.skills/docker-compose-topology.md`
- `.skills/demo-readiness.md`
- `.skills/policy-and-metadata.md` (future, do not implement early)
- `.skills/agent-client-constraint.md` (future, do not implement early)

## Hard constraints

- **Do not add Apollo to active runtime.** Forbidden in any file outside
  `prototype-apollo/`: `@apollo/server`, `ApolloServer`, `expressMiddleware`,
  `graphql-gateway`, `apollo-server`.
- **Do not modify `prototype-apollo/`** unless a PRD explicitly says so.
- **Do not implement future-phase features early.** If the current PRD says
  policy or the agent orchestrator or the frontend is out of scope, do not add
  placeholders, types, services, or env vars for them.
- **Update `scripts/verify.sh`** when you change behavior. Verification is the
  source of truth.
- **Follow the commit cadence** described in the PRD. Commit per milestone, not
  at the end. Each commit should be an inspectable, working state.
- **Report all commits and verification results** at the end of your run.

## Viaduct framework skills (provenance)

This repo uses Viaduct framework skills vendored from
[`viaduct-dev/skills`](https://github.com/viaduct-dev/skills) under
`.viaduct/agents/`. Those skills explain Viaduct mechanics (query resolvers,
field resolvers, node types, batching, mutations, connections, relationships,
scopes).

Local project skills in `.skills/` define **this repo's architecture, PRD
process, verification rules, and demo constraints**. When framework guidance
and local guidance conflict, local guidance wins.

<!-- VIADUCT-AGENTS-MD-START -->
[Viaduct Docs]|root: ./.viaduct/agents

## Viaduct Framework

**⚠️ MANDATORY: Read the relevant doc before implementing.**

| Task | Read First |
|------|------------|
| Any mutation | mutations.md |
| Any query with ID argument | query-resolver.md |
| Field with @resolver | field-resolver.md |
| Type with `implements Node` | node-type.md |
| List field, N+1 prevention | batch.md |
| Field returning another Node (createdBy, owner) | relationships.md |
| Scope/visibility | scopes.md |

**⚠️ @idOf CHECK:** Before implementing, scan schema for `id: ID!` in input
types and query args. If missing `@idOf`, add it first. See `mutations.md` or
`query-resolver.md`.
<!-- VIADUCT-AGENTS-MD-END -->

## Active verification

```bash
docker compose up --build -d
./scripts/verify.sh
```

`./scripts/verify.sh` must exit zero before you call a PRD complete.
