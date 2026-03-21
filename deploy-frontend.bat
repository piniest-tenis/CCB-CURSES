@echo off
:: deploy-frontend.bat
:: Builds the Next.js frontend and syncs the static export to S3.
:: Run from the repo root: deploy-frontend.bat
::
:: Required variables in frontend\.env.local (or set in shell):
::   AWS_ACCESS_KEY_ID       — IAM deploy user access key
::   AWS_SECRET_ACCESS_KEY   — IAM deploy user secret key
::   CF_DISTRIBUTION_ID      — CloudFront distribution ID
::   FRONTEND_S3_BUCKET      — S3 bucket name for the static export
::
:: See .env.example at the repo root for documentation on every variable.
:: NEVER hardcode credentials in this file.

setlocal EnableDelayedExpansion

set ENV_FILE=%~dp0frontend\.env.local

if not exist "%ENV_FILE%" (
  echo ERROR: %ENV_FILE% not found.
  echo Copy .env.example to frontend\.env.local and fill in the required values.
  echo See .env.example for documentation on every variable.
  exit /b 1
)

:: Parse key=value pairs from .env.local, skipping comment lines and blank lines
for /f "usebackq tokens=1,* delims==" %%A in (`findstr /v "^#" "%ENV_FILE%"`) do (
  set "KEY=%%A"
  set "VAL=%%B"
  :: Strip surrounding whitespace from key/value loaded from .env.local
  for /f "tokens=* delims= " %%K in ("!KEY!") do set "KEY=%%K"
  for /f "tokens=* delims= " %%V in ("!VAL!") do set "VAL=%%V"
  if defined KEY if "!KEY:~-1!"==" " set "KEY=!KEY:~0,-1!"
  if defined VAL if "!VAL:~-1!"==" " set "VAL=!VAL:~0,-1!"
  if not "!KEY!"=="" (
    set "!KEY!=!VAL!"
  )
)

if "%AWS_ACCESS_KEY_ID%"=="" (
  echo ERROR: AWS_ACCESS_KEY_ID not found in %ENV_FILE%
  exit /b 1
)
if "%AWS_SECRET_ACCESS_KEY%"=="" (
  echo ERROR: AWS_SECRET_ACCESS_KEY not found in %ENV_FILE%
  exit /b 1
)
if "%CF_DISTRIBUTION_ID%"=="" (
  echo ERROR: CF_DISTRIBUTION_ID not found in %ENV_FILE%
  exit /b 1
)
if "%FRONTEND_S3_BUCKET%"=="" (
  echo ERROR: FRONTEND_S3_BUCKET not found in %ENV_FILE%
  exit /b 1
)

cd /d "%~dp0frontend"

:: ── Build ─────────────────────────────────────────────────────────────────────
echo.
echo [1/2] Building frontend...
echo.
call npm run build
if errorlevel 1 (
  echo.
  echo ERROR: Build failed. Deploy aborted.
  exit /b 1
)

:: ── Deploy ────────────────────────────────────────────────────────────────────
echo.
echo [2/2] Deploying to S3 ^(CloudFront: %CF_DISTRIBUTION_ID%^)...
echo.
node scripts/deploy-s3.mjs
if errorlevel 1 (
  echo.
  echo ERROR: Deploy failed.
  exit /b 1
)

echo.
echo Done.
endlocal
