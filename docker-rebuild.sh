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

echo
echo "=== 4ktbot Docker: limpieza y reconstruccion (macOS) ==="
echo

if ! command -v docker >/dev/null 2>&1; then
	echo "ERROR: Docker no esta instalado. Instala Docker Desktop para Mac."
	exit 1
fi

if ! docker info >/dev/null 2>&1; then
	echo "ERROR: Docker Desktop no esta corriendo. Abrelo e intenta de nuevo."
	exit 1
fi

if [[ ! -f .env ]]; then
	echo "ERROR: Falta el archivo .env en esta carpeta."
	echo "Copia .envexample a .env y configuralo antes de continuar."
	exit 1
fi

mkdir -p auth_info db temp media_storage media_storage/pic media_storage/vo
touch logs.txt log.txt

echo "[1/4] Deteniendo contenedores anteriores..."
docker compose down --remove-orphans 2>/dev/null || true
docker rm -f 4ktbot capcut-tts 2>/dev/null || true

echo "[2/4] Eliminando imagenes anteriores del bot..."
docker rmi 4ktbot:latest 2>/dev/null || true

echo "[3/4] Construyendo imagen nueva..."
docker compose build --no-cache

echo "[4/4] Iniciando contenedor..."
docker compose up -d
start_log_follower

PORT=4000
if grep -q '^port=' .env 2>/dev/null; then
	PORT="$(grep -E '^port=' .env | tail -1 | cut -d= -f2- | tr -d '\r' | xargs)"
fi
PORT="${PORT:-4000}"

echo
echo "Listo. 4ktbot corriendo en http://localhost:${PORT}"
echo "Logs del bot (app):  ./logs.txt"
echo "Logs del contenedor: ./log.txt"
echo "Ver en vivo:         docker compose logs -f 4ktbot"
echo
