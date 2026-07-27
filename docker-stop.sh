#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ -f .docker-log.pid ]]; then
	kill "$(cat .docker-log.pid)" 2>/dev/null || true
	rm -f .docker-log.pid
fi

echo "Deteniendo 4ktbot (Docker)..."
docker compose down --remove-orphans 2>/dev/null || true
docker rm -f 4ktbot capcut-tts 2>/dev/null || true
echo "Listo."
