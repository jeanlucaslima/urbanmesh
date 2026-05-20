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

require_url() {
  local url="$1"

  if ! curl -fsS "$url" > /dev/null; then
    fail "Health check failed: $url"
  fi
}

section "Checking Docker Compose services"

EXPECTED_SERVICES=(
  "web"
  "agent-orchestrator"
  "graphql-gateway"
  "customer-service"
  "billing-service"
  "support-service"
  "usage-service"
  "policy-service"
  "postgres"
)

RUNNING_SERVICES="$(docker compose ps --services)"

for service in "${EXPECTED_SERVICES[@]}"; do
  echo "$RUNNING_SERVICES" | grep -q "^${service}$" || fail "Missing service: $service"
done

docker compose ps

section "Checking health endpoints"

require_url "http://localhost:3000"
require_url "http://localhost:4000/health"
require_url "http://localhost:5000/health"
require_url "http://localhost:5101/health"
require_url "http://localhost:5102/health"
require_url "http://localhost:5103/health"
require_url "http://localhost:5104/health"
require_url "http://localhost:5105/health"

section "Checking Postgres seed data"

docker compose exec -T postgres psql -U demo -d demo -c "\dt"

docker compose exec -T postgres psql -U demo -d demo -c "select id, name from customers where id = 'C-1027';" > /tmp/agent-safe-demo-customer.txt

require_contains "/tmp/agent-safe-demo-customer.txt" "C-1027"
require_contains "/tmp/agent-safe-demo-customer.txt" "AcmeCloud"

section "Checking internal services"

curl -fsS "http://localhost:5101/customers/C-1027" > /tmp/agent-safe-demo-customer-service.json
require_contains "/tmp/agent-safe-demo-customer-service.json" "C-1027"
require_contains "/tmp/agent-safe-demo-customer-service.json" "AcmeCloud"

curl -fsS "http://localhost:5102/billing/C-1027" > /tmp/agent-safe-demo-billing-service.json
require_contains "/tmp/agent-safe-demo-billing-service.json" "overdue"

curl -fsS "http://localhost:5103/support/customers/C-1027/tickets" > /tmp/agent-safe-demo-support-service.json
require_contains "/tmp/agent-safe-demo-support-service.json" "severity"

curl -fsS "http://localhost:5104/usage/customers/C-1027" > /tmp/agent-safe-demo-usage-service.json
require_contains "/tmp/agent-safe-demo-usage-service.json" "declining"

section "Checking policy service"

curl -fsS -X POST "http://localhost:5105/check" \
  -H "Content-Type: application/json" \
  -d '{
    "actorRole": "AI_ASSISTANT",
    "resource": "BillingDetails",
    "field": "internalFinanceNotes",
    "action": "read"
  }' > /tmp/agent-safe-demo-policy-ai.json

require_contains "/tmp/agent-safe-demo-policy-ai.json" '"allowed":false'

curl -fsS -X POST "http://localhost:5105/check" \
  -H "Content-Type: application/json" \
  -d '{
    "actorRole": "ADMIN",
    "resource": "BillingDetails",
    "field": "internalFinanceNotes",
    "action": "read"
  }' > /tmp/agent-safe-demo-policy-admin.json

require_contains "/tmp/agent-safe-demo-policy-admin.json" '"allowed":true'

section "Checking GraphQL gateway for AI_ASSISTANT"

curl -fsS -X POST "http://localhost:5000/graphql" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query CustomerSituation($id: ID!, $actorRole: ActorRole!) { customerSituation(id: $id, actorRole: $actorRole) { customer { id name plan healthScore } billing { billingStatus unpaidInvoiceCount unpaidAmount paymentMethodLast4 internalFinanceNotes riskScore } support { openTicketCount highestSeverity } usage { activeUsers usageTrend featureAdoptionScore } execution { servicesTouched blockedFields { path reason } policyDecisions { resource field action allowed reason } } } }",
    "variables": {
      "id": "C-1027",
      "actorRole": "AI_ASSISTANT"
    }
  }' > /tmp/agent-safe-demo-graphql-ai.json

require_contains "/tmp/agent-safe-demo-graphql-ai.json" "AcmeCloud"
require_contains "/tmp/agent-safe-demo-graphql-ai.json" "customer-service"
require_contains "/tmp/agent-safe-demo-graphql-ai.json" "billing-service"
require_contains "/tmp/agent-safe-demo-graphql-ai.json" "support-service"
require_contains "/tmp/agent-safe-demo-graphql-ai.json" "usage-service"
require_contains "/tmp/agent-safe-demo-graphql-ai.json" "policy-service"
require_contains "/tmp/agent-safe-demo-graphql-ai.json" "billing.paymentMethodLast4"
require_contains "/tmp/agent-safe-demo-graphql-ai.json" "billing.internalFinanceNotes"
require_contains "/tmp/agent-safe-demo-graphql-ai.json" "billing.riskScore"

section "Checking GraphQL gateway for ADMIN"

curl -fsS -X POST "http://localhost:5000/graphql" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query CustomerSituation($id: ID!, $actorRole: ActorRole!) { customerSituation(id: $id, actorRole: $actorRole) { billing { paymentMethodLast4 internalFinanceNotes riskScore } execution { blockedFields { path reason } } } }",
    "variables": {
      "id": "C-1027",
      "actorRole": "ADMIN"
    }
  }' > /tmp/agent-safe-demo-graphql-admin.json

require_contains "/tmp/agent-safe-demo-graphql-admin.json" "paymentMethodLast4"
require_contains "/tmp/agent-safe-demo-graphql-admin.json" "internalFinanceNotes"
require_contains "/tmp/agent-safe-demo-graphql-admin.json" "riskScore"

if grep -q "billing.paymentMethodLast4\|billing.internalFinanceNotes\|billing.riskScore" /tmp/agent-safe-demo-graphql-admin.json; then
  cat /tmp/agent-safe-demo-graphql-admin.json
  fail "GraphQL ADMIN check failed: sensitive billing fields should not be blocked for ADMIN."
fi

section "Checking agent orchestrator"

curl -fsS -X POST "http://localhost:4000/run" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Summarize customer C-1027 and recommend the next support action.",
    "customerId": "C-1027",
    "actorRole": "AI_ASSISTANT"
  }' > /tmp/agent-safe-demo-agent.json

require_contains "/tmp/agent-safe-demo-agent.json" "AcmeCloud"
require_contains "/tmp/agent-safe-demo-agent.json" "graphqlQuery"
require_contains "/tmp/agent-safe-demo-agent.json" "graphqlVariables"
require_contains "/tmp/agent-safe-demo-agent.json" "execution"
require_contains "/tmp/agent-safe-demo-agent.json" "blockedFields"
require_contains "/tmp/agent-safe-demo-agent.json" "billing.paymentMethodLast4"
require_contains "/tmp/agent-safe-demo-agent.json" "billing.internalFinanceNotes"
require_contains "/tmp/agent-safe-demo-agent.json" "billing.riskScore"

section "Checking architecture constraint"

SEARCH_PATHS=()

if [ -d "apps/agent-orchestrator" ]; then
  SEARCH_PATHS+=("apps/agent-orchestrator")
fi

if [ -d "services/agent-orchestrator" ]; then
  SEARCH_PATHS+=("services/agent-orchestrator")
fi

if [ "${#SEARCH_PATHS[@]}" -eq 0 ]; then
  fail "Could not find agent-orchestrator source directory."
fi

FORBIDDEN_PATTERN="5101\|5102\|5103\|5104\|5105\|customer-service\|billing-service\|support-service\|usage-service\|policy-service\|CUSTOMER_SERVICE_URL\|BILLING_SERVICE_URL\|SUPPORT_SERVICE_URL\|USAGE_SERVICE_URL\|POLICY_SERVICE_URL"

if grep -R "$FORBIDDEN_PATTERN" "${SEARCH_PATHS[@]}" 2>/dev/null; then
  fail "agent-orchestrator appears to reference internal services directly."
fi

section "All checks passed"
