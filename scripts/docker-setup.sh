#!/usr/bin/env bash
# One-time local setup: checks Docker, creates .env, builds and starts the stack,
# imports the n8n workflows. Safe to re-run.
#
#   ./scripts/docker-setup.sh            # real Claude extraction (needs ANTHROPIC_API_KEY in .env)
#   ./scripts/docker-setup.sh --offline  # demo mode, no API keys needed
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

say "Checking Docker"
command -v docker >/dev/null || die "Docker is not installed. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
docker info >/dev/null 2>&1 || die "Docker is installed but not running. Open Docker Desktop and wait for 'Engine running', then re-run."
docker compose version >/dev/null 2>&1 || die "'docker compose' not found. Update Docker Desktop (Compose v2 is included)."
echo "OK: $(docker --version)"

if [[ ! -f .env ]]; then
  say "Creating .env from .env.example"
  cp .env.example .env
fi
if [[ "${1:-}" == "--offline" ]]; then
  sed -i.bak 's/^EXTRACTOR=.*/EXTRACTOR=sidecar/' .env && rm -f .env.bak
  echo "Offline demo mode: drawings are read from samples/drawings/*.json, no Claude calls."
elif ! grep -qE '^ANTHROPIC_API_KEY=.+' .env; then
  echo "Note: ANTHROPIC_API_KEY is empty in .env. Add it, or re-run with --offline for the demo mode."
fi

say "Building and starting containers (first run downloads ~1 GB, takes a few minutes)"
docker compose up -d --build

say "Waiting for services"
for i in $(seq 1 60); do
  if curl -fs http://localhost:8000/health >/dev/null && curl -fs http://localhost:5678/healthz >/dev/null; then break; fi
  sleep 2
  [[ $i == 60 ]] && die "Services did not come up. Check: docker compose logs"
done
echo "quote-service: $(curl -fs http://localhost:8000/health)"
echo "n8n: up"

say "Importing n8n workflows"
docker compose exec -T n8n n8n import:workflow --separate --input=/workflows

cat <<'EOF'

Done. Next:
  1. Open http://localhost:5678 and create your n8n owner account.
  2. Open the two "WhatsApp quote agent" workflows (imported, inactive).
  3. Twilio credential: Credentials > Add > "Basic Auth", name it "Twilio API (Basic Auth)",
     user = Twilio Account SID, password = Auth Token. Select it on the "Send WhatsApp" nodes.
  4. Publish both workflows once Twilio is connected (README step 3).

Useful:
  http://localhost:8000/docs     quote-service API
  http://localhost:8000/quotes   quotes so far
  docker compose logs -f         live logs
  docker compose down            stop (data is kept in Docker volumes)
EOF
