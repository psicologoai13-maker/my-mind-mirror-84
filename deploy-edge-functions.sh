#!/bin/bash
# Deploy all 9 edge functions to Supabase
# Usage: SUPABASE_ACCESS_TOKEN=<token> bash deploy-edge-functions.sh

PROJECT_REF="pcsoranahgoinljvgmtl"

FUNCTIONS=(
  "elevenlabs-conversation-token"
  "aria-push-notification"
  "sync-healthkit"
  "calculate-correlations"
  "ai-dashboard"
  "doctor-view-data"
  "redeem-points"
  "generate-clinical-report"
  "process-session"
)

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN is not set."
  echo "Run: export SUPABASE_ACCESS_TOKEN=<your-token>"
  exit 1
fi

echo "=== Deploying ${#FUNCTIONS[@]} edge functions to project $PROJECT_REF ==="
echo ""

SUCCESS=0
FAIL=0

for fn in "${FUNCTIONS[@]}"; do
  echo "--- Deploying: $fn ---"
  npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF" 2>&1
  if [ $? -eq 0 ]; then
    echo "✅ $fn deployed successfully"
    ((SUCCESS++))
  else
    echo "❌ $fn FAILED"
    ((FAIL++))
  fi
  echo ""
done

echo "=== RISULTATO FINALE ==="
echo "Successi: $SUCCESS / ${#FUNCTIONS[@]}"
echo "Falliti:  $FAIL / ${#FUNCTIONS[@]}"
