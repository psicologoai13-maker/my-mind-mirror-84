#!/bin/bash

set -e

PROJECT_REF="pcsoranahgoinljvgmtl"

FUNCTIONS=(
  ai-analysis
  ai-chat
  ai-checkins
  ai-dashboard
  ai-insights
  aria-agent-backend
  aria-push-notification
  aria-voice-chat
  create-habit-chat
  create-objective-chat
  doctor-view-data
  generate-clinical-report
  process-session
  thematic-diary-chat
  update-objective-chat
  aria-chat-ios
  calculate-correlations
  detect-emotion-patterns
  elevenlabs-context
  elevenlabs-conversation-token
  gemini-voice
  gemini-voice-native
  real-time-context
  refresh-global-context
  sync-habits-to-brain
)

echo "Deploying ${#FUNCTIONS[@]} edge functions to project: $PROJECT_REF"
echo "============================================================"

for FUNC in "${FUNCTIONS[@]}"; do
  echo ""
  echo ">>> Deploying: $FUNC"
  supabase functions deploy "$FUNC" --project-ref "$PROJECT_REF"
  echo "<<< Done: $FUNC"
done

echo ""
echo "============================================================"
echo "All ${#FUNCTIONS[@]} functions deployed successfully."
