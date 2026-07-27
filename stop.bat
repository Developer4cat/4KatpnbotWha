@echo off
cd /d "%~dp0"
echo Deteniendo 4ktbot...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*index.ts*' -or $_.CommandLine -like '*4ktbot*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

echo Listo. Bot detenido.
