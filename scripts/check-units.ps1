# Single responsibility: run the pixel unit gate over the style files.
# The gate itself lives in tools/build/check-units.mjs, so it runs the same way
# on a Windows machine and on the build server.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$checker = Join-Path $root "tools\build\check-units.mjs"
node $checker
exit $LASTEXITCODE
