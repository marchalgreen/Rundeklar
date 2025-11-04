#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./push-env.sh production .env
#   ./push-env.sh preview .env.preview
#   ./push-env.sh development .env.local
#
# Rules:
# - Keys present in the env file are synced (add or update).
# - If a key’s value is "__UNSET__", it will be removed from that Vercel environment.
# - Keys NOT mentioned in the file are left untouched (no surprise re-additions).
# - NODE_ENV is ignored (Vercel controls it).

ENVIRONMENT="${1:-production}"           # production | preview | development
ENV_FILE="${2:-.env}"

if ! command -v vercel >/dev/null 2>&1; then
  echo "❌ Vercel CLI not found. Install: npm i -g vercel" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Env file not found: $ENV_FILE" >&2
  exit 1
fi

echo "🚀 Syncing $ENV_FILE → Vercel ($ENVIRONMENT)"

# Read non-empty, non-comment lines safely (works on macOS Bash 3.2)
# We use a pipeline + while read loop (no 'mapfile').
grep -vE '^\s*$|^\s*#' "$ENV_FILE" | while IFS= read -r LINE; do
  # Split KEY=VALUE but allow '=' inside VALUE
  KEY="${LINE%%=*}"
  VAL="${LINE#*=}"

  # Trim key whitespace
  KEY="$(printf '%s' "$KEY" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  [[ -z "$KEY" ]] && continue
  [[ "$KEY" == "NODE_ENV" ]] && { echo "⏭️  Skipping NODE_ENV"; continue; }

  # Strip surrounding single/double quotes from value
  VAL="${VAL%\"}"; VAL="${VAL#\"}"
  VAL="${VAL%\'}"; VAL="${VAL#\'}"

  if [[ "$VAL" == "__UNSET__" ]]; then
    echo "🗑️  Removing $KEY"
    vercel env rm "$KEY" "$ENVIRONMENT" -y >/dev/null 2>&1 || true
    continue
  fi

  # Try update; if update fails (not found), add it
  if printf "%s" "$VAL" | vercel env update "$KEY" "$ENVIRONMENT" >/dev/null 2>&1; then
    echo "✏️   Updated $KEY"
  else
    if printf "%s" "$VAL" | vercel env add "$KEY" "$ENVIRONMENT" >/dev/null 2>&1; then
      echo "➕  Added   $KEY"
    else
      echo "❌ Failed  $KEY" >&2
    fi
  fi
done

echo "✅ Done. Redeploy to apply changes."