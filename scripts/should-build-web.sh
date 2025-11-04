#!/usr/bin/env bash
set -euo pipefail

# If there is no base commit (e.g., first build), build.
if [ -z "${VERCEL_GIT_COMMIT_REF:-}" ] || [ -z "${VERCEL_GIT_COMMIT_SHA:-}" ]; then
  echo "no git context; build"
  exit 1
fi

# Compare against the last deployed commit; fallback to HEAD~1.
BASE="${VERCEL_GIT_PREVIOUS_SHA:-HEAD~1}"

# Build if changes touched web app or shared infra.
if git diff --name-only "$BASE"...HEAD | grep -E \
'^(packages/web/|packages/(shared|ui|config)/|pnpm-lock\.yaml|pnpm-workspace\.yaml|turbo\.json|\.github/|.vercel/|package.json)'; then
  echo "web-relevant changes; build"
  exit 1
fi

echo "no web-relevant changes; skip"
exit 0