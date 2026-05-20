#!/usr/bin/env bash
set -euo pipefail

# Optional: probe the live SF 311 source directly. This is NOT part of the
# main verify.sh pass — verify.sh must succeed offline. Use this script
# during demo prep to confirm the upstream DataSF endpoint is healthy.
#
#   ./scripts/check-sf311-live.sh

ENDPOINT="https://data.sfgov.org/resource/vw6y-z8j6.json"
URL="${ENDPOINT}?\$limit=5&\$order=requested_datetime%20DESC&\$q=Mission"

echo "==> Fetching live SF 311 (dataset vw6y-z8j6) for Mission..."
echo "    $URL"
echo ""

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 2
fi

body=$(curl -fsS --max-time 5 "$URL")
count=$(printf '%s' "$body" | grep -o '"service_request_id"' | wc -l | tr -d ' ')
echo "Records returned: $count"
echo ""
printf '%s\n' "$body" | head -c 600
echo ""
echo ""

if [ "$count" -eq 0 ]; then
  echo "No records returned. The dataset may be empty for this query." >&2
  exit 1
fi

echo "==> Live SF 311 reachable. Demo can run in SF311_MODE=auto."
