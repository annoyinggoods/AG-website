@echo off
title Annoying Goods - control panel
rem Starts the control panel server and opens it in the browser.
rem Double click this file to work; keep the window open while the panel
rem runs.
rem
rem The panel is the dev-only helper. It serves the built site, edits the
rem sources, and publishes to IONOS. It never ships with the site.
rem
rem The helper stops itself after 45 minutes without a request, and the
rem [Disconnect server] button in the panel stops it right away.

if "%ADMIN_PORT%"=="" set ADMIN_PORT=8787
set AG_PANEL_URL=http://127.0.0.1:%ADMIN_PORT%/admin/

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on the PATH, and the control panel needs it.
  echo Install Node.js from https://nodejs.org, then run this file again.
  pause
  exit /b 1
)

rem The launcher opens the panel page when the helper is not running yet,
rem and opens it again when a helper is already there.
node "%~dp0launch.mjs"

echo.
pause
