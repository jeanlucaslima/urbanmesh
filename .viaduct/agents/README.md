# Viaduct framework skills (vendored)

These docs are vendored from
[`viaduct-dev/skills`](https://github.com/viaduct-dev/skills) at the
commit recorded below. They explain Viaduct framework mechanics and are
referenced from the project's root `AGENTS.md`.

## Provenance

- Source: `viaduct-dev/skills`
- Branch: `main`
- Vendored on: 2026-05-20
- Method: `gh api repos/viaduct-dev/skills/contents/skills/<skill>/SKILL.md`
  with the YAML frontmatter stripped, equivalent to running their
  `bin/install.sh`.

## Files

| File              | Source skill              | When to read                                                    |
| ----------------- | ------------------------- | --------------------------------------------------------------- |
| `mutations.md`    | `viaduct-mutations`       | Any mutation, CRUD, `@idOf` in input types                      |
| `query-resolver.md` | `viaduct-query-resolver`| Any query with ID argument                                      |
| `field-resolver.md` | `viaduct-field-resolver`| Field with `@resolver` directive                                |
| `node-type.md`    | `viaduct-node-type`       | Type with `implements Node`                                     |
| `batch.md`        | `viaduct-batch`           | List field, N+1 prevention                                      |
| `relationships.md`| `viaduct-relationships`   | Field returning another Node (createdBy, owner)                 |
| `scopes.md`       | `viaduct-scopes`          | Scope/visibility configuration                                  |

## Updating

To refresh against the upstream:

```bash
# From repo root
for entry in viaduct-mutations:mutations.md viaduct-query-resolver:query-resolver.md \
             viaduct-field-resolver:field-resolver.md viaduct-node-type:node-type.md \
             viaduct-batch:batch.md viaduct-relationships:relationships.md \
             viaduct-scopes:scopes.md; do
  src="${entry%%:*}"; out="${entry##*:}"
  gh api "repos/viaduct-dev/skills/contents/skills/$src/SKILL.md" --jq '.content' \
    | base64 -d | sed '/^---$/,/^---$/d' > ".viaduct/agents/$out"
done
```

## Authority

Local skills in `.skills/` override these when they conflict. See
`AGENTS.md`.
