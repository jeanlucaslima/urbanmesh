#!/usr/bin/env bash
set -euo pipefail

section() {
  echo ""
  echo "==> $1"
}

fail() {
  echo "ERROR: $1"
  exit 1
}

require_contains() {
  local file="$1"
  local expected="$2"

  if ! grep -q "$expected" "$file"; then
    echo ""
    echo "File contents:"
    cat "$file"
    echo ""
    fail "Expected '$expected' in $file"
  fi
}

require_url_ok() {
  local url="$1"
  if ! curl -fsS "$url" > /dev/null; then
    fail "HTTP check failed: $url"
  fi
}

section "[1/7] Checking Docker Compose services"

EXPECTED_SERVICES=("viaduct-server")
RUNNING_SERVICES="$(docker compose ps --services)"
for service in "${EXPECTED_SERVICES[@]}"; do
  echo "$RUNNING_SERVICES" | grep -q "^${service}$" || fail "Missing service: $service"
done
docker compose ps

section "[2/7] Checking /health"

curl -fsS http://localhost:8080/health > /tmp/viaduct-demo-health.json
require_contains /tmp/viaduct-demo-health.json '"ok"'
require_contains /tmp/viaduct-demo-health.json 'true'
require_contains /tmp/viaduct-demo-health.json '"service"'
require_contains /tmp/viaduct-demo-health.json '"viaduct-server"'

section "[3/7] Checking /graphql greeting"

curl -fsS -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ greeting }"}' > /tmp/viaduct-demo-greeting.json
require_contains /tmp/viaduct-demo-greeting.json '"greeting"'
require_contains /tmp/viaduct-demo-greeting.json 'Hello, World!'

section "[4/7] Checking /graphql customer(id: \"C-1027\")"

curl -fsS -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query($id:ID!){ customer(id:$id) { id name status } }","variables":{"id":"C-1027"}}' \
  > /tmp/viaduct-demo-customer.json

require_contains /tmp/viaduct-demo-customer.json '"id"'
require_contains /tmp/viaduct-demo-customer.json 'C-1027'
require_contains /tmp/viaduct-demo-customer.json '"name"'
require_contains /tmp/viaduct-demo-customer.json '"status"'
require_contains /tmp/viaduct-demo-customer.json 'RISKY'

section "[5/7] Checking /graphiql"

curl -fsS http://localhost:8080/graphiql > /tmp/viaduct-demo-graphiql.html
# GraphiQL HTML should mention graphiql somewhere (title, asset name, etc.)
if ! grep -qi 'graphiql' /tmp/viaduct-demo-graphiql.html; then
  head -20 /tmp/viaduct-demo-graphiql.html
  fail "Response from /graphiql does not look like GraphiQL HTML."
fi

section "[6/7] Checking root active runtime contains no Apollo"

# Scan everything except prototype-apollo/, .git, build artifacts.
APOLLO_PATTERN='@apollo/server\|expressMiddleware\|graphql-gateway\|ApolloServer'
MATCHES=$(grep -RIn --exclude-dir=prototype-apollo --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=build --exclude-dir=.gradle --exclude=verify.sh "$APOLLO_PATTERN" . 2>/dev/null || true)
if [ -n "$MATCHES" ]; then
  echo "$MATCHES"
  fail "Active root runtime references Apollo. Move references under prototype-apollo/."
fi

section "[7/7] Checking prototype-apollo is ignored by active verification"

# Sanity: prototype directory must exist (we're explicitly ignoring it, not absent).
if [ ! -d prototype-apollo ]; then
  fail "prototype-apollo/ directory not found."
fi
echo "prototype-apollo/ present and excluded from active checks."

section "All checks passed"
