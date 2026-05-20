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

# Re-usable GraphQL query body for the full UrbanContext. $1 = actorRole.
full_query() {
  local role="$1"
  cat <<EOF
{"query":"query { block(id: \"SF-1027\", actorRole: $role) { id name neighborhood planningStatus planningRisk zoning { district allowedUses heightLimit specialUseDistrict } permits { activePermits recentPermits estimatedProjectValue complianceRisk } civic { openCases latestIssue escalationStatus } transit { nearbyStops accessScore ridershipTrend } census { population medianIncome housingDensity } } }"}
EOF
}

section "[1/19] Checking Docker Compose services"

EXPECTED_SERVICES=(
  "postgres"
  "location-service"
  "permits-service"
  "civic-service"
  "transit-service"
  "census-service"
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
require_url_ok http://localhost:5106/health
require_url_ok http://localhost:5005/health
require_url_ok http://localhost:3000

curl -fsS http://localhost:8080/health > /tmp/h_viaduct.json
curl -fsS http://localhost:5101/health > /tmp/h_location.json
curl -fsS http://localhost:5102/health > /tmp/h_permits.json
curl -fsS http://localhost:5103/health > /tmp/h_civic.json
curl -fsS http://localhost:5104/health > /tmp/h_transit.json
curl -fsS http://localhost:5105/health > /tmp/h_policy.json
curl -fsS http://localhost:5106/health > /tmp/h_census.json
curl -fsS http://localhost:5005/health > /tmp/h_agent.json
require_contains /tmp/h_viaduct.json  '"viaduct-server"'
require_contains /tmp/h_location.json '"location-service"'
require_contains /tmp/h_permits.json  '"permits-service"'
require_contains /tmp/h_civic.json    '"civic-service"'
require_contains /tmp/h_transit.json  '"transit-service"'
require_contains /tmp/h_policy.json   '"policy-service"'
require_contains /tmp/h_census.json   '"census-service"'
require_contains /tmp/h_agent.json    '"agent-orchestrator"'

section "[3/19] Checking Postgres seed data"

docker compose exec -T postgres psql -U demo -d demo -c "\dt" > /tmp/tables.txt
require_contains /tmp/tables.txt city_blocks
require_contains /tmp/tables.txt zoning
require_contains /tmp/tables.txt permits
require_contains /tmp/tables.txt civic_cases
require_contains /tmp/tables.txt transit_summaries
require_contains /tmp/tables.txt census_profiles

docker compose exec -T postgres psql -U demo -d demo \
  -c "select id, name, neighborhood, planning_risk from city_blocks order by id;" \
  > /tmp/blocks.txt
for id in SF-1001 SF-1027 SF-2044; do
  require_contains /tmp/blocks.txt "$id"
done

section "[4/19] Checking city-domain services directly"

curl -fsS http://localhost:5101/blocks/SF-1027 > /tmp/d_location.json
require_contains /tmp/d_location.json '16th & Mission'
require_contains /tmp/d_location.json '"HIGH"'

curl -fsS http://localhost:5101/blocks/SF-1027/zoning > /tmp/d_zoning.json
require_contains /tmp/d_zoning.json '"NCT-3"'

curl -fsS http://localhost:5102/permits/SF-1027 > /tmp/d_permits.json
require_contains /tmp/d_permits.json '"complianceRisk"'

curl -fsS http://localhost:5103/civic/blocks/SF-1027/cases > /tmp/d_civic.json
require_contains /tmp/d_civic.json '"severity"'

curl -fsS http://localhost:5104/transit/blocks/SF-1027 > /tmp/d_transit.json
require_contains /tmp/d_transit.json '"increasing"'

curl -fsS http://localhost:5106/census/blocks/SF-1027 > /tmp/d_census.json
require_contains /tmp/d_census.json '"housingDensity"'

section "[5/19] Checking policy-service /check"

curl -fsS -X POST http://localhost:5105/check -H 'Content-Type: application/json' \
  -d '{"actorRole":"PUBLIC_AI_ASSISTANT","field":"PermitSummary.estimatedProjectValue","blockId":"SF-1027"}' \
  > /tmp/p_ai_value.json
require_contains /tmp/p_ai_value.json '"allowed":false'

curl -fsS -X POST http://localhost:5105/check -H 'Content-Type: application/json' \
  -d '{"actorRole":"CITY_ADMIN","field":"PermitSummary.estimatedProjectValue"}' \
  > /tmp/p_admin_value.json
require_contains /tmp/p_admin_value.json '"allowed":true'

curl -fsS -X POST http://localhost:5105/check -H 'Content-Type: application/json' \
  -d '{"actorRole":"CIVIC_OPERATOR","field":"CivicCaseSummary.escalationStatus"}' \
  > /tmp/p_civic_esc.json
require_contains /tmp/p_civic_esc.json '"allowed":true'

curl -fsS -X POST http://localhost:5105/check -H 'Content-Type: application/json' \
  -d '{"actorRole":"PERMIT_ANALYST","field":"PermitSummary.complianceRisk"}' \
  > /tmp/p_permit_cr.json
require_contains /tmp/p_permit_cr.json '"allowed":true'

curl -fsS -X POST http://localhost:5105/check -H 'Content-Type: application/json' \
  -d '{"actorRole":"PERMIT_ANALYST","field":"CivicCaseSummary.escalationStatus"}' \
  > /tmp/p_permit_esc.json
require_contains /tmp/p_permit_esc.json '"allowed":false'

section "[6/19] Viaduct block-only query with actorRole"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  -d '{"query":"query { block(id: \"SF-1027\", actorRole: CITY_ADMIN) { id name neighborhood planningStatus planningRisk } }"}' \
  > /tmp/q_co.json
require_no_errors /tmp/q_co.json
require_contains /tmp/q_co.json '"16th & Mission"'
require_contains /tmp/q_co.json '"Elevated review"'
require_contains /tmp/q_co.json '"HIGH"'

section "[7/19] Viaduct full UrbanContext as PUBLIC_AI_ASSISTANT"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  --data-binary "$(full_query PUBLIC_AI_ASSISTANT)" > /tmp/q_ai.json
require_no_errors /tmp/q_ai.json
require_contains /tmp/q_ai.json '"16th & Mission"'
require_contains /tmp/q_ai.json '"planningRisk" *: *null'
require_contains /tmp/q_ai.json '"estimatedProjectValue" *: *null'
require_contains /tmp/q_ai.json '"complianceRisk" *: *null'
require_contains /tmp/q_ai.json '"escalationStatus" *: *null'

section "[8/19] Viaduct full UrbanContext as CITY_ADMIN"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  --data-binary "$(full_query CITY_ADMIN)" > /tmp/q_admin.json
require_no_errors /tmp/q_admin.json
require_contains /tmp/q_admin.json '"16th & Mission"'
require_not_contains /tmp/q_admin.json '"planningRisk" *: *null'
require_not_contains /tmp/q_admin.json '"estimatedProjectValue" *: *null'
require_not_contains /tmp/q_admin.json '"complianceRisk" *: *null'
require_not_contains /tmp/q_admin.json '"escalationStatus" *: *null'
require_contains /tmp/q_admin.json '"ESCALATED"'

section "[9/19] Viaduct full UrbanContext as CIVIC_OPERATOR"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  --data-binary "$(full_query CIVIC_OPERATOR)" > /tmp/q_civic.json
require_no_errors /tmp/q_civic.json
require_contains /tmp/q_civic.json '"estimatedProjectValue" *: *null'
require_contains /tmp/q_civic.json '"complianceRisk" *: *null'
require_not_contains /tmp/q_civic.json '"escalationStatus" *: *null'
require_contains /tmp/q_civic.json '"ESCALATED"'
require_not_contains /tmp/q_civic.json '"planningRisk" *: *null'

section "[10/19] Viaduct full UrbanContext as PERMIT_ANALYST"

curl -fsS -X POST "$GQL" -H 'Content-Type: application/json' \
  --data-binary "$(full_query PERMIT_ANALYST)" > /tmp/q_permit.json
require_no_errors /tmp/q_permit.json
require_contains /tmp/q_permit.json '"escalationStatus" *: *null'
require_not_contains /tmp/q_permit.json '"estimatedProjectValue" *: *null'
require_not_contains /tmp/q_permit.json '"complianceRisk" *: *null'

section "[11/19] Execution metadata in extensions"

for f in location-service permits-service civic-service transit-service census-service policy-service; do
  require_contains /tmp/q_ai.json "\"$f\""
done
for f in CityBlock.planningRisk PermitSummary.estimatedProjectValue PermitSummary.complianceRisk CivicCaseSummary.escalationStatus; do
  require_contains /tmp/q_ai.json "\"$f\""
done
require_contains /tmp/q_ai.json '"decision" *: *"DENY"'
require_contains /tmp/q_ai.json '"actorRole" *: *"PUBLIC_AI_ASSISTANT"'

require_contains /tmp/q_admin.json '"blockedFields" *: *\[ *\]'
require_contains /tmp/q_admin.json '"decision" *: *"ALLOW"'
require_not_contains /tmp/q_admin.json '"decision" *: *"DENY"'

section "[12/19] Agent /run as Public AI Assistant"

curl -fsS -X POST "$AGENT/run" -H 'Content-Type: application/json' \
  -d '{"task":"Explain what is happening around 16th & Mission","actorRole":"PUBLIC_AI_ASSISTANT"}' \
  > /tmp/a_ai.json
require_contains /tmp/a_ai.json '"answer"'
require_contains /tmp/a_ai.json '"query"'
require_contains /tmp/a_ai.json '"variables"'
require_contains /tmp/a_ai.json '"executionMetadata"'
require_contains /tmp/a_ai.json '"id" *: *"SF-1027"'
require_contains /tmp/a_ai.json '"actorRole" *: *"PUBLIC_AI_ASSISTANT"'
require_contains /tmp/a_ai.json '"16th & Mission"'
for f in CityBlock.planningRisk PermitSummary.estimatedProjectValue PermitSummary.complianceRisk CivicCaseSummary.escalationStatus; do
  require_contains /tmp/a_ai.json "\"$f\""
done
require_contains /tmp/a_ai.json 'restricted'

section "[13/19] Agent /run as City Admin"

curl -fsS -X POST "$AGENT/run" -H 'Content-Type: application/json' \
  -d '{"task":"Explain what is happening around 16th & Mission","actorRole":"CITY_ADMIN"}' \
  > /tmp/a_admin.json
require_contains /tmp/a_admin.json '"16th & Mission"'
require_contains /tmp/a_admin.json '"blockedFields" *: *\[ *\]'
require_contains /tmp/a_admin.json 'No fields were blocked'

section "[14/19] Agent validation paths + envelope stability"

# Missing block ID / place
curl -s -X POST "$AGENT/run" -H 'Content-Type: application/json' \
  -d '{"task":"Explain what is happening","actorRole":"PUBLIC_AI_ASSISTANT"}' \
  > /tmp/a_missing.json
require_contains /tmp/a_missing.json '"missing_block_id"'
require_contains /tmp/a_missing.json '"executionMetadata" *: *null'

# Invalid role
curl -s -X POST "$AGENT/run" -H 'Content-Type: application/json' \
  -d '{"task":"Explain what is happening around 16th & Mission","actorRole":"GUEST"}' \
  > /tmp/a_invrole.json
require_contains /tmp/a_invrole.json '"invalid_actor_role"'
require_contains /tmp/a_invrole.json '"executionMetadata" *: *null'

# Multi-block rejection
curl -s -X POST "$AGENT/run" -H 'Content-Type: application/json' \
  -d '{"task":"Compare SF-1027 and SF-1001","actorRole":"PUBLIC_AI_ASSISTANT"}' \
  > /tmp/a_multi.json
require_contains /tmp/a_multi.json '"multiple_block_ids"'
require_contains /tmp/a_multi.json '"executionMetadata" *: *null'

# Case-insensitive ID
curl -s -X POST "$AGENT/run" -H 'Content-Type: application/json' \
  -d '{"task":"explain block sf-1027","actorRole":"PUBLIC_AI_ASSISTANT"}' \
  > /tmp/a_lower.json
require_contains /tmp/a_lower.json '"id" *: *"SF-1027"'
require_contains /tmp/a_lower.json '"validationError" *: *null'

# Stable envelope on success: every required key present.
for k in answer query variables data executionMetadata validationError graphQLErrors; do
  require_contains /tmp/a_ai.json "\"$k\""
done

section "[15/19] Frontend reachable + UrbanMesh copy"

curl -fsS http://localhost:3000 > /tmp/f_index.html
require_contains /tmp/f_index.html '<div id="root">'
require_contains /tmp/f_index.html 'UrbanMesh'

curl -fsS http://localhost:3000/src/App.tsx > /tmp/f_app.tsx
# Required UI controls
require_contains /tmp/f_app.tsx 'Run through Viaduct'
require_contains /tmp/f_app.tsx 'PUBLIC_AI_ASSISTANT'
require_contains /tmp/f_app.tsx 'CIVIC_OPERATOR'
require_contains /tmp/f_app.tsx 'PERMIT_ANALYST'
require_contains /tmp/f_app.tsx 'CITY_ADMIN'

# UrbanMesh copy
require_contains /tmp/f_app.tsx 'UrbanMesh'
require_contains /tmp/f_app.tsx 'Turning San Francisco into a GraphQL server'
require_contains /tmp/f_app.tsx 'One city question. Many civic domains'

# Architecture proof
require_contains /tmp/f_app.tsx 'Architecture proof'
require_contains /tmp/f_app.tsx 'No direct calls to'
require_contains /tmp/f_app.tsx 'location, permits, civic, transit, census'

# Metadata panel labels
require_contains /tmp/f_app.tsx 'Services coordinated by the graph'
require_contains /tmp/f_app.tsx 'What the graph had to call'
require_contains /tmp/f_app.tsx 'What policy removed'
require_contains /tmp/f_app.tsx 'Why each sensitive field was allowed or denied'

# UrbanMesh presets
for label in 'Block review' 'Planner view' 'Civic cases' 'Permit review' 'Ordinary block'; do
  require_contains /tmp/f_app.tsx "$label"
done

# Role-contrast helper
require_contains /tmp/f_app.tsx 'received the full sensitive context'
require_contains /tmp/f_app.tsx 'received a policy-filtered view'

# Friendly role labels in the selector
for label in 'Public AI Assistant' 'Civic Operator' 'Permit Analyst' 'City Admin'; do
  require_contains /tmp/f_app.tsx "$label"
done

section "[16/19] Architecture constraint: agent source"

INTERNAL_PATTERN='location-service\|permits-service\|civic-service\|transit-service\|census-service\|policy-service'
MATCHES=$(grep -RIn \
  --exclude-dir=node_modules --exclude-dir=build --exclude-dir=.gradle \
  "$INTERNAL_PATTERN" apps/agent-orchestrator 2>/dev/null || true)
if [ -n "$MATCHES" ]; then
  echo "$MATCHES"
  fail "agent-orchestrator source references a city service directly. It must only call \$GRAPHQL_URL."
fi

section "[17/19] Architecture constraint: frontend source"

MATCHES=$(grep -RIn \
  --exclude-dir=node_modules --exclude-dir=build --exclude-dir=.gradle \
  "$INTERNAL_PATTERN" apps/web 2>/dev/null || true)
if [ -n "$MATCHES" ]; then
  echo "$MATCHES"
  fail "frontend source references a city service directly. It must only call the agent."
fi

section "[18/19] Apollo absence in active runtime"

APOLLO_PATTERN='@apollo/server\|expressMiddleware\|graphql-gateway\|ApolloServer\|apollo-server'
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

section "[19/19] prototype-apollo + skills + no legacy customer language"

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

# Old CRM-style language must not appear in the active demo. Allow it only
# inside prototype-apollo/, docs/prds/archive/, and explicit migration notes.
LEGACY_PATTERN='C-1027\|AcmeCloud\|Northstar Labs\|customer-service\|billing-service\|support-service\|usage-service\|CustomerContext\|BillingAccount\|SupportSummary\|UsageSummary'
LEGACY_MATCHES=$(grep -RIn \
  --exclude-dir=prototype-apollo --exclude-dir=.git \
  --exclude-dir=node_modules --exclude-dir=build --exclude-dir=.gradle \
  --exclude=verify.sh \
  --include='*.ts' --include='*.tsx' --include='*.kt' --include='*.kts' \
  --include='*.graphqls' --include='*.graphql' --include='*.json' \
  --include='*.yml' --include='*.yaml' --include='*.html' --include='*.css' \
  --include='*.sql' \
  "$LEGACY_PATTERN" . 2>/dev/null || true)
if [ -n "$LEGACY_MATCHES" ]; then
  echo "$LEGACY_MATCHES"
  fail "Legacy customer/billing/support/usage language found in active demo source."
fi

section "All checks passed"
