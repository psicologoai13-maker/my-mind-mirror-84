#!/usr/bin/env bash
#
# Test comparativo: ai-chat (Cervello Unificato V2.0) vs ai-chat-legacy (pre-unificazione)
#
# Uso: ./scripts/test-brain-comparison.sh <JWT_TOKEN>
#

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Uso: $0 <JWT_TOKEN>"
  echo "Esempio: $0 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  exit 1
fi

TOKEN="$1"
BASE_URL="https://pcsoranahgoinljvgmtl.supabase.co/functions/v1"

# 5 messaggi di test
MESSAGES=(
  "Ciao, come stai?"
  "Mi sento in ansia per un colloquio domani"
  "Ho litigato con il mio ragazzo e non so come risolvere"
  "Non ce la faccio più, è tutto inutile"
  "Oggi ho preso 30 all'esame!"
)

echo "=============================================="
echo "  TEST COMPARATIVO: NUOVO vs LEGACY"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="
echo ""

for i in "${!MESSAGES[@]}"; do
  MSG="${MESSAGES[$i]}"
  NUM=$((i + 1))

  echo "----------------------------------------------"
  echo "  TEST $NUM/5: \"$MSG\""
  echo "----------------------------------------------"
  echo ""

  BODY=$(printf '{"messages":[{"role":"user","content":"%s"}],"stream":false}' "$MSG")

  # Chiamata al NUOVO (ai-chat)
  REPLY_NEW=$(curl -s -X POST "$BASE_URL/ai-chat" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$BODY" | jq -r '.reply // .error // "Nessuna risposta"')

  # Chiamata al LEGACY (ai-chat-legacy)
  REPLY_LEGACY=$(curl -s -X POST "$BASE_URL/ai-chat-legacy" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$BODY" | jq -r '.reply // .error // "Nessuna risposta"')

  echo "[NUOVO]  $REPLY_NEW"
  echo ""
  echo "[LEGACY] $REPLY_LEGACY"
  echo ""
done

echo "=============================================="
echo "  TEST COMPLETATO"
echo "=============================================="
