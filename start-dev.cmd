@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\.bin\next.cmd" (
  echo [AI_DRAWING] node_modules was not found or dependencies are incomplete.
  echo [AI_DRAWING] Please install dependencies before starting the dev server.
  pause
  exit /b 1
)

echo [AI_DRAWING] Starting Next.js dev server...
echo [AI_DRAWING] Open http://localhost:3000 after the server prints Ready.
echo [AI_DRAWING] Keep this window open while using the app.
echo.

node_modules\.bin\next.cmd dev -H 0.0.0.0 -p 3000

echo.
echo [AI_DRAWING] Dev server stopped.
pause
