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
