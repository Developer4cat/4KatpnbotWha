#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

stop_log_follower() {
	if [[ -f .docker-log.pid ]]; then
		kill "$(cat .docker-log.pid)" 2>/dev/null || true
		rm -f .docker-log.pid
	fi
}

start_log_follower() {
	stop_log_follower
	nohup bash -c 'docker compose logs -f 4ktbot >> log.txt 2>&1' >/dev/null 2>&1 &
	echo $! > .docker-log.pid
}

if ! command -v docker >/dev/null 2>&1; then
	echo "ERROR: Docker no esta instalado."
	exit 1
fi

if ! docker info >/dev/null 2>&1; then
	echo "ERROR: Docker Desktop no esta corriendo."
	exit 1
fi

if [[ ! -f .env ]]; then
	echo "ERROR: Falta .env (copia .envexample a .env)."
	exit 1
fi

mkdir -p auth_info db temp media_storage media_storage/pic media_storage/vo
touch logs.txt log.txt

echo "Iniciando 4ktbot..."
docker compose up -d

start_log_follower

PORT=4000
if grep -q '^port=' .env 2>/dev/null; then
	PORT="$(grep -E '^port=' .env | tail -1 | cut -d= -f2- | tr -d '\r' | xargs)"
fi
PORT="${PORT:-4000}"

echo
echo "Contenedor iniciado: 4ktbot"
echo "URL: http://localhost:${PORT}"
echo
echo "Logs del bot (app):  ./logs.txt"
echo "Logs del contenedor: ./log.txt"
echo "Ver en vivo:         docker compose logs -f 4ktbot"
echo
