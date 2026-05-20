# prototype-apollo — archived reference

This directory contains the original Apollo-based architecture prototype.
It is preserved as reference only.

The active demo is the Viaduct/Ktor implementation at the repo root.
Do not use this prototype for the talk demo.

The original prototype README is preserved here as `APOLLO_README.md` for
historical context.

The prototype proved one architectural constraint that still holds in the
real demo:

```
agent-orchestrator -> /graphql only (never to internal services directly)
```

That constraint is what the Viaduct demo at the repo root inherits.
Everything else (gateway, resolvers, policy, metadata) is being rebuilt
on the Viaduct/Ktor stack and should not reference anything in this
directory.

## Off-limits for active development

Coding agents:

- Do **not** modify files in this directory unless a PRD explicitly
  scopes work here.
- Do **not** import, copy, or move code from this directory into active
  paths (`viaduct-server/`, `services/`, `scripts/`, root configs).
- Do **not** restart Apollo, the prototype's `graphql-gateway`, or the
  prototype's agent orchestrator from active compose or scripts.
- The root `scripts/verify.sh` actively grep-excludes this directory.
  If your change makes verify.sh trip over `prototype-apollo/`, fix the
  exclusion — do not delete files here.
