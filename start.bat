@echo off

echo [1/2] Frontend build...
cd /d "%~dp0frontend"
call npm run build

if errorlevel 1 (
    echo Frontend build failed!
    pause
    exit /b 1
)

echo [2/2] Starting backend...
cd /d "%~dp0backend"
node server.js

pause