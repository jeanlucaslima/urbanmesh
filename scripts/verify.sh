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

require_no_errors() {
  local file="$1"
  if grep -q '"errors"' "$file"; then
    cat "$file"
    fail "GraphQL response contained errors: $file"
  fi
}

GQL='http://localhost:8080/graphql'

section "[1/11] Checking Docker Compose services"

EXPECTED_SERVICES=(
  "postgres"
  "customer-service"
  "billing-service"
  "support-service"
  "usage-service"
  "viaduct-server"
)
RUNNING_SERVICES="$(docker compose ps --services)"
for svc in "${EXPECTED_SERVICES[@]}"; do
  echo "$RUNNING_SERVICES" | grep -q "^${svc}$" || fail "Missing service: $svc"
done
docker compose ps

section "[2/11] Checking health endpoints"

require_url_ok http://localhost:8080/health
require_url_ok http://localhost:5101/health
require_url_ok http://localhost:5102/health
require_url_ok http://localhost:5103/health
require_url_ok http://localhost:5104/health

curl -fsS http://localhost:8080/health  > /tmp/h_viaduct.json
curl -fsS http://localhost:5101/health  > /tmp/h_customer.json
curl -fsS http://localhost:5102/health  > /tmp/h_billing.json
curl -fsS http://localhost:5103/health  > /tmp/h_support.json
curl -fsS http://localhost:5104/health  > /tmp/h_usage.json
require_contains /tmp/h_viaduct.json   '"viaduct-server"'
require_contains /tmp/h_customer.json  '"customer-service"'
require_contains /tmp/h_billing.json   '"billing-service"'
require_contains /tmp/h_support.json   '"support-service"'
require_contains /tmp/h_usage.json     '"usage-service"'

section "[3/11] Checking Postgres seed data"

docker compose exec -T postgres psql -U demo -d demo -c "\dt" > /tmp/tables.txt
require_contains /tmp/tables.txt customers
require_contains /tmp/tables.txt billing
require_contains /tmp/tables.txt support_tickets
require_contains /tmp/tables.txt usage_summaries

docker compose exec -T postgres psql -U demo -d demo \
  -c "select id, name, status, risk_level from customers order by id;" \
  > /tmp/customers.txt
require_contains /tmp/customers.txt 'C-1001'
require_contains /tmp/customers.txt 'C-1027'
require_contains /tmp/customers.txt 'C-2044'
require_contains /tmp/customers.txt 'HEALTHY'
require_contains /tmp/customers.txt 'RISKY'
require_contains /tmp/customers.txt 'RESTRICTED'

section "[4/11] Checking internal services directly"

curl -fsS http://localhost:5101/customers/C-1027 > /tmp/d_customer.json
require_contains /tmp/d_customer.json 'AcmeCloud'
require_contains /tmp/d_customer.json '"RISKY"'

curl -fsS http://localhost:5102/billing/C-1027 > /tmp/d_billing.json
require_contains /tmp/d_billing.json '"overdue"'

curl -fsS http://localhost:5103/support/customers/C-1027/tickets > /tmp/d_support.json
require_contains /tmp/d_support.json '"severity"'

curl -fsS http://localhost:5104/usage/customers/C-1027 > /tmp/d_usage.json
require_contains /tmp/d_usage.json '"declining"'

section "[5/11] Viaduct customer-only query"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  -d '{"query":"query { customer(id: \"C-1027\") { id name status riskLevel } }"}' \
  > /tmp/q_customer.json
require_no_errors /tmp/q_customer.json
require_contains /tmp/q_customer.json '"C-1027"'
require_contains /tmp/q_customer.json '"AcmeCloud"'
require_contains /tmp/q_customer.json '"RISKY"'
require_contains /tmp/q_customer.json '"riskLevel"'

section "[6/11] Viaduct customer + billing"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  -d '{"query":"query { customer(id: \"C-1027\") { id billing { balance overdueInvoices paymentRisk } } }"}' \
  > /tmp/q_billing.json
require_no_errors /tmp/q_billing.json
require_contains /tmp/q_billing.json '"balance"'
require_contains /tmp/q_billing.json '"overdueInvoices"'
require_contains /tmp/q_billing.json '"paymentRisk"'
require_contains /tmp/q_billing.json '"HIGH"'

section "[7/11] Viaduct customer + support"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  -d '{"query":"query { customer(id: \"C-1027\") { id support { openTickets latestIssue escalationStatus } } }"}' \
  > /tmp/q_support.json
require_no_errors /tmp/q_support.json
require_contains /tmp/q_support.json '"openTickets"'
require_contains /tmp/q_support.json '"latestIssue"'
require_contains /tmp/q_support.json '"ESCALATED"'

section "[8/11] Viaduct customer + usage"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  -d '{"query":"query { customer(id: \"C-1027\") { id usage { activeUsers monthlyEvents usageTrend } } }"}' \
  > /tmp/q_usage.json
require_no_errors /tmp/q_usage.json
require_contains /tmp/q_usage.json '"activeUsers"'
require_contains /tmp/q_usage.json '"monthlyEvents"'
require_contains /tmp/q_usage.json '"declining"'

section "[9/11] Viaduct full customer context"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  -d '{"query":"query CustomerContext { customer(id: \"C-1027\") { id name status riskLevel billing { balance overdueInvoices paymentRisk } support { openTickets latestIssue escalationStatus } usage { activeUsers monthlyEvents usageTrend } } }"}' \
  > /tmp/q_full.json
require_no_errors /tmp/q_full.json
require_contains /tmp/q_full.json '"AcmeCloud"'
require_contains /tmp/q_full.json '"balance"'
require_contains /tmp/q_full.json '"openTickets"'
require_contains /tmp/q_full.json '"activeUsers"'
require_contains /tmp/q_full.json '"riskLevel"'

section "[10/11] Apollo absence in active root"

APOLLO_PATTERN='@apollo/server\|expressMiddleware\|graphql-gateway\|ApolloServer'
MATCHES=$(grep -RIn \
  --exclude-dir=prototype-apollo --exclude-dir=.git \
  --exclude-dir=node_modules --exclude-dir=build --exclude-dir=.gradle \
  --exclude=verify.sh "$APOLLO_PATTERN" . 2>/dev/null || true)
if [ -n "$MATCHES" ]; then
  echo "$MATCHES"
  fail "Active root runtime references Apollo. Move references under prototype-apollo/."
fi

section "[11/11] prototype-apollo preserved and ignored"

[ -d prototype-apollo ] || fail "prototype-apollo/ directory missing."
echo "prototype-apollo/ present and excluded from active checks."

section "All checks passed"
