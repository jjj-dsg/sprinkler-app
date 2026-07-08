#!/usr/bin/env bash
# Deploy SprinklerSmart to Vercel production, behind the git-author identity gate.
# Invoked by `npm run deploy:prod`.
set -euo pipefail

cd "$(dirname "$0")/.."

# A `vercel deploy --prod` from the CLI never touches Vercel's Git integration, so nothing
# upstream checks who authored the commit. If this gate is not here, it does not exist.
EXPECTED_AUTHOR="jeff.jones@desertservicesgroup.com"
ACTUAL_AUTHOR=$(git log -1 --format='%ae')
if [[ "$ACTUAL_AUTHOR" != "$EXPECTED_AUTHOR" ]]; then
  echo "BLOCKED: HEAD is authored by '$ACTUAL_AUTHOR', expected '$EXPECTED_AUTHOR'." >&2
  echo "Amend the commit under the right identity. Never override local git identity to pass this." >&2
  exit 1
fi

echo "Deploying $(git rev-parse --short HEAD) by $ACTUAL_AUTHOR to production…"
exec npx -y vercel@latest deploy --prod
