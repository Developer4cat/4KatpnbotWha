@echo off
cd /d "%~dp0"
echo.
echo === 4ktbot Docker: limpieza y reconstruccion ===
echo.

where docker >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker no esta instalado o no esta en PATH.
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Desktop no esta corriendo. Inicialo e intenta de nuevo.
    exit /b 1
)

if not exist ".env" (
    echo ERROR: Falta el archivo .env en esta carpeta.
    echo Copia .envexample a .env y configuralo antes de continuar.
    exit /b 1
)

echo [1/4] Deteniendo contenedores anteriores...
docker compose down --remove-orphans 2>nul
docker rm -f 4ktbot capcut-tts 2>nul

echo [2/4] Eliminando imagen anterior del bot...
docker rmi 4ktbot:latest 2>nul

echo [3/4] Construyendo imagen nueva...
docker compose build --no-cache
if errorlevel 1 (
    echo ERROR: Fallo la construccion de la imagen.
    exit /b 1
)

echo [4/4] Iniciando contenedor...
docker compose up -d
if errorlevel 1 (
    echo ERROR: No se pudo iniciar el contenedor.
    exit /b 1
)

echo.
echo Listo. 4ktbot corriendo en http://localhost:4000
echo Ver logs: docker compose logs -f 4ktbot
echo.
