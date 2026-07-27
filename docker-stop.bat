@echo off

cd /d "%~dp0"

echo Deteniendo 4ktbot (Docker)...

docker compose down --remove-orphans 2>nul

docker rm -f 4ktbot capcut-tts 2>nul

echo Listo.

