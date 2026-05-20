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

require_not_contains() {
  local file="$1"
  local unexpected="$2"
  if grep -q "$unexpected" "$file"; then
    echo ""
    echo "File contents:"
    cat "$file"
    echo ""
    fail "Did not expect '$unexpected' in $file"
  fi
}

require_url_ok() {
  local url="$1"
  if ! curl -fsS "$url" > /dev/null; then
    fail "HTTP check failed: $url"
  fi
}

require_no_errors() {
  local file="$1"
  if grep -q '"errors"' "$file"; then
    cat "$file"
    fail "GraphQL response contained errors: $file"
  fi
}

GQL='http://localhost:8080/graphql'
AGENT='http://localhost:5005'

# Re-usable GraphQL query body for the full customer context. $1 = actorRole.
full_query() {
  local role="$1"
  cat <<EOF
{"query":"query { customer(id: \"C-1027\", actorRole: $role) { id name status riskLevel billing { balance overdueInvoices paymentRisk } support { openTickets latestIssue escalationStatus } usage { activeUsers monthlyEvents usageTrend } } }"}
EOF
}

section "[1/19] Checking Docker Compose services"

EXPECTED_SERVICES=(
  "postgres"
  "customer-service"
  "billing-service"
  "support-service"
  "usage-service"
  "policy-service"
  "viaduct-server"
  "agent-orchestrator"
  "frontend"
)
RUNNING_SERVICES="$(docker compose ps --services)"
for svc in "${EXPECTED_SERVICES[@]}"; do
  echo "$RUNNING_SERVICES" | grep -q "^${svc}$" || fail "Missing service: $svc"
done
docker compose ps

section "[2/19] Checking health endpoints"

require_url_ok http://localhost:8080/health
require_url_ok http://localhost:5101/health
require_url_ok http://localhost:5102/health
require_url_ok http://localhost:5103/health
require_url_ok http://localhost:5104/health
require_url_ok http://localhost:5105/health
require_url_ok http://localhost:5005/health
require_url_ok http://localhost:3000

curl -fsS http://localhost:8080/health  > /tmp/h_viaduct.json
curl -fsS http://localhost:5101/health  > /tmp/h_customer.json
curl -fsS http://localhost:5102/health  > /tmp/h_billing.json
curl -fsS http://localhost:5103/health  > /tmp/h_support.json
curl -fsS http://localhost:5104/health  > /tmp/h_usage.json
curl -fsS http://localhost:5105/health  > /tmp/h_policy.json
curl -fsS http://localhost:5005/health  > /tmp/h_agent.json
require_contains /tmp/h_viaduct.json   '"viaduct-server"'
require_contains /tmp/h_customer.json  '"customer-service"'
require_contains /tmp/h_billing.json   '"billing-service"'
require_contains /tmp/h_support.json   '"support-service"'
require_contains /tmp/h_usage.json     '"usage-service"'
require_contains /tmp/h_policy.json    '"policy-service"'
require_contains /tmp/h_agent.json     '"agent-orchestrator"'

section "[3/19] Checking Postgres seed data"

docker compose exec -T postgres psql -U demo -d demo -c "\dt" > /tmp/tables.txt
require_contains /tmp/tables.txt customers
require_contains /tmp/tables.txt billing
require_contains /tmp/tables.txt support_tickets
require_contains /tmp/tables.txt usage_summaries

docker compose exec -T postgres psql -U demo -d demo \
  -c "select id, name, status, risk_level from customers order by id;" \
  > /tmp/customers.txt
for id in C-1001 C-1027 C-2044; do
  require_contains /tmp/customers.txt "$id"
done

section "[4/19] Checking internal services directly"

curl -fsS http://localhost:5101/customers/C-1027 > /tmp/d_customer.json
require_contains /tmp/d_customer.json 'AcmeCloud'
require_contains /tmp/d_customer.json '"RISKY"'

curl -fsS http://localhost:5102/billing/C-1027 > /tmp/d_billing.json
require_contains /tmp/d_billing.json '"overdue"'

curl -fsS http://localhost:5103/support/customers/C-1027/tickets > /tmp/d_support.json
require_contains /tmp/d_support.json '"severity"'

curl -fsS http://localhost:5104/usage/customers/C-1027 > /tmp/d_usage.json
require_contains /tmp/d_usage.json '"declining"'

section "[5/19] Checking policy-service /check"

curl -fsS -X POST http://localhost:5105/check -H 'Content-Type: application/json' \
  -d '{"actorRole":"AI_ASSISTANT","field":"BillingAccount.balance","customerId":"C-1027"}' \
  > /tmp/p_ai_balance.json
require_contains /tmp/p_ai_balance.json '"allowed":false'

curl -fsS -X POST http://localhost:5105/check -H 'Content-Type: application/json' \
  -d '{"actorRole":"ADMIN","field":"BillingAccount.balance"}' \
  > /tmp/p_admin_balance.json
require_contains /tmp/p_admin_balance.json '"allowed":true'

curl -fsS -X POST http://localhost:5105/check -H 'Content-Type: application/json' \
  -d '{"actorRole":"SUPPORT_AGENT","field":"SupportSummary.escalationStatus"}' \
  > /tmp/p_support_esc.json
require_contains /tmp/p_support_esc.json '"allowed":true'

curl -fsS -X POST http://localhost:5105/check -H 'Content-Type: application/json' \
  -d '{"actorRole":"FINANCE_AGENT","field":"BillingAccount.paymentRisk"}' \
  > /tmp/p_finance_pr.json
require_contains /tmp/p_finance_pr.json '"allowed":true'

curl -fsS -X POST http://localhost:5105/check -H 'Content-Type: application/json' \
  -d '{"actorRole":"FINANCE_AGENT","field":"SupportSummary.escalationStatus"}' \
  > /tmp/p_finance_esc.json
require_contains /tmp/p_finance_esc.json '"allowed":false'

section "[6/19] Viaduct customer-only query with actorRole"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  -d '{"query":"query { customer(id: \"C-1027\", actorRole: ADMIN) { id name status riskLevel } }"}' \
  > /tmp/q_co.json
require_no_errors /tmp/q_co.json
require_contains /tmp/q_co.json '"AcmeCloud"'
require_contains /tmp/q_co.json '"RISKY"'
require_contains /tmp/q_co.json '"HIGH"'

section "[7/19] Viaduct full query as AI_ASSISTANT"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  --data-binary "$(full_query AI_ASSISTANT)" > /tmp/q_ai.json
require_no_errors /tmp/q_ai.json
require_contains /tmp/q_ai.json '"AcmeCloud"'
require_contains /tmp/q_ai.json '"riskLevel" *: *null'
require_contains /tmp/q_ai.json '"balance" *: *null'
require_contains /tmp/q_ai.json '"paymentRisk" *: *null'
require_contains /tmp/q_ai.json '"escalationStatus" *: *null'

section "[8/19] Viaduct full query as ADMIN"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  --data-binary "$(full_query ADMIN)" > /tmp/q_admin.json
require_no_errors /tmp/q_admin.json
require_contains /tmp/q_admin.json '"AcmeCloud"'
require_not_contains /tmp/q_admin.json '"riskLevel" *: *null'
require_not_contains /tmp/q_admin.json '"balance" *: *null'
require_not_contains /tmp/q_admin.json '"paymentRisk" *: *null'
require_not_contains /tmp/q_admin.json '"escalationStatus" *: *null'
require_contains /tmp/q_admin.json '"ESCALATED"'

section "[9/19] Viaduct full query as SUPPORT_AGENT"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  --data-binary "$(full_query SUPPORT_AGENT)" > /tmp/q_support.json
require_no_errors /tmp/q_support.json
require_contains /tmp/q_support.json '"balance" *: *null'
require_contains /tmp/q_support.json '"paymentRisk" *: *null'
require_not_contains /tmp/q_support.json '"escalationStatus" *: *null'
require_contains /tmp/q_support.json '"ESCALATED"'
require_not_contains /tmp/q_support.json '"riskLevel" *: *null'

section "[10/19] Viaduct full query as FINANCE_AGENT"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  --data-binary "$(full_query FINANCE_AGENT)" > /tmp/q_finance.json
require_no_errors /tmp/q_finance.json
require_contains /tmp/q_finance.json '"escalationStatus" *: *null'
require_not_contains /tmp/q_finance.json '"balance" *: *null'
require_not_contains /tmp/q_finance.json '"paymentRisk" *: *null'

section "[11/19] Execution metadata in extensions"

for f in customer-service billing-service support-service usage-service policy-service; do
  require_contains /tmp/q_ai.json "\"$f\""
done
for f in Customer.riskLevel BillingAccount.balance BillingAccount.paymentRisk SupportSummary.escalationStatus; do
  require_contains /tmp/q_ai.json "\"$f\""
done
require_contains /tmp/q_ai.json '"decision" *: *"DENY"'
require_contains /tmp/q_ai.json '"actorRole" *: *"AI_ASSISTANT"'

require_contains /tmp/q_admin.json '"blockedFields" *: *\[ *\]'
require_contains /tmp/q_admin.json '"decision" *: *"ALLOW"'
require_not_contains /tmp/q_admin.json '"decision" *: *"DENY"'

section "[12/19] Agent /run AI_ASSISTANT"

curl -fsS -X POST "$AGENT/run" -H 'Content-Type: application/json' \
  -d '{"task":"Explain customer C-1027 risk","actorRole":"AI_ASSISTANT"}' \
  > /tmp/a_ai.json
require_contains /tmp/a_ai.json '"answer"'
require_contains /tmp/a_ai.json '"query"'
require_contains /tmp/a_ai.json '"variables"'
require_contains /tmp/a_ai.json '"executionMetadata"'
require_contains /tmp/a_ai.json '"id" *: *"C-1027"'
require_contains /tmp/a_ai.json '"actorRole" *: *"AI_ASSISTANT"'
require_contains /tmp/a_ai.json '"AcmeCloud"'
# Required AI denials surfaced in metadata
for f in Customer.riskLevel BillingAccount.balance BillingAccount.paymentRisk SupportSummary.escalationStatus; do
  require_contains /tmp/a_ai.json "\"$f\""
done
require_contains /tmp/a_ai.json 'restricted'

section "[13/19] Agent /run ADMIN"

curl -fsS -X POST "$AGENT/run" -H 'Content-Type: application/json' \
  -d '{"task":"Explain customer C-1027 risk","actorRole":"ADMIN"}' \
  > /tmp/a_admin.json
require_contains /tmp/a_admin.json '"AcmeCloud"'
require_contains /tmp/a_admin.json '"blockedFields" *: *\[ *\]'
# No-blocked answer language
require_contains /tmp/a_admin.json 'No fields were blocked'

section "[14/19] Agent /run missing customer ID"

curl -s -X POST "$AGENT/run" -H 'Content-Type: application/json' \
  -d '{"task":"Explain risk","actorRole":"AI_ASSISTANT"}' \
  > /tmp/a_missing.json
require_contains /tmp/a_missing.json '"missing_customer_id"'
# The envelope shape is stable: executionMetadata is null when the agent
# never called Viaduct.
require_contains /tmp/a_missing.json '"executionMetadata" *: *null'
require_contains /tmp/a_missing.json '"validationError"'

section "[15/19] Frontend reachable"

curl -fsS http://localhost:3000 > /tmp/f_index.html
require_contains /tmp/f_index.html '<div id="root">'
require_contains /tmp/f_index.html 'Viaduct Agent Demo'

# Vite dev serves the SPA shell at /, with labels rendered by React.
# Check the live App.tsx bundle for the role selector + button labels.
curl -fsS http://localhost:3000/src/App.tsx > /tmp/f_app.tsx
require_contains /tmp/f_app.tsx 'Run through Viaduct'
require_contains /tmp/f_app.tsx 'AI_ASSISTANT'
require_contains /tmp/f_app.tsx 'SUPPORT_AGENT'
require_contains /tmp/f_app.tsx 'FINANCE_AGENT'
require_contains /tmp/f_app.tsx 'ADMIN'

section "[16/19] Architecture constraint: agent source"

INTERNAL_PATTERN='customer-service\|billing-service\|support-service\|usage-service\|policy-service'
MATCHES=$(grep -RIn \
  --exclude-dir=node_modules --exclude-dir=build --exclude-dir=.gradle \
  "$INTERNAL_PATTERN" apps/agent-orchestrator 2>/dev/null || true)
if [ -n "$MATCHES" ]; then
  echo "$MATCHES"
  fail "agent-orchestrator source references an internal service directly. It must only call \$GRAPHQL_URL."
fi

section "[17/19] Architecture constraint: frontend source"

MATCHES=$(grep -RIn \
  --exclude-dir=node_modules --exclude-dir=build --exclude-dir=.gradle \
  "$INTERNAL_PATTERN" apps/web 2>/dev/null || true)
if [ -n "$MATCHES" ]; then
  echo "$MATCHES"
  fail "frontend source references an internal service directly. It must only call the agent."
fi

section "[18/19] Apollo absence in active runtime"

APOLLO_PATTERN='@apollo/server\|expressMiddleware\|graphql-gateway\|ApolloServer\|apollo-server'
# Documentation files (AGENTS.md, .skills/, .viaduct/, docs/, PROJECT_STATUS.md)
# intentionally name these tokens to describe the rule itself, so they are
# excluded along with the verify script. Runtime/config files are not.
MATCHES=$(grep -RIn \
  --exclude-dir=prototype-apollo --exclude-dir=.git \
  --exclude-dir=node_modules --exclude-dir=build --exclude-dir=.gradle \
  --exclude-dir=.skills --exclude-dir=.viaduct --exclude-dir=docs \
  --exclude=verify.sh --exclude=AGENTS.md --exclude=PROJECT_STATUS.md \
  "$APOLLO_PATTERN" . 2>/dev/null || true)
if [ -n "$MATCHES" ]; then
  echo "$MATCHES"
  fail "Active runtime references Apollo. Move references under prototype-apollo/ or remove."
fi

section "[19/19] prototype-apollo preserved + skills present"

[ -d prototype-apollo ] || fail "prototype-apollo/ directory missing."
[ -f prototype-apollo/README.md ] || fail "prototype-apollo/README.md missing."
grep -qi 'reference only\|archived\|not part of the active demo' prototype-apollo/README.md \
  || fail "prototype-apollo/README.md does not mark itself as reference-only."

[ -f AGENTS.md ] || fail "AGENTS.md missing."
grep -q 'Viaduct-first\|Ktor-hosted Viaduct' AGENTS.md \
  || fail "AGENTS.md does not declare the active Viaduct architecture."

CORE_SKILLS=(
  ".skills/project-architecture.md"
  ".skills/prd-implementation.md"
  ".skills/commit-cadence.md"
  ".skills/verification-qa.md"
  ".skills/viaduct-kotlin-ktor.md"
)
for f in "${CORE_SKILLS[@]}"; do
  [ -f "$f" ] || fail "Missing required local skill: $f"
done

if [ -d .viaduct/agents ]; then
  for f in mutations.md query-resolver.md field-resolver.md node-type.md \
           batch.md relationships.md scopes.md; do
    [ -f ".viaduct/agents/$f" ] || fail "Missing vendored Viaduct skill: .viaduct/agents/$f"
  done
  echo "Vendored Viaduct framework skills present at .viaduct/agents/"
else
  echo "NOTE: .viaduct/agents/ not present (skills not vendored in this checkout)."
fi

section "All checks passed"
