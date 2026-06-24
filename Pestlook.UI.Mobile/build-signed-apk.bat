@echo off
REM Build and publish signed Android APK
REM Auto-increments ApplicationVersion and ApplicationDisplayVersion before each build

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Pestlook Android APK Builder
echo ========================================
echo.

set SCRIPT_DIR=%~dp0
set CSPROJ=%SCRIPT_DIR%Pestlook.UI.Mobile.csproj

REM ── Increment version numbers in .csproj ─────────────────────────────────────
echo Incrementing version numbers...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$csproj = '%CSPROJ:\=\\%';" ^
  "[xml]$xml = Get-Content $csproj;" ^
  "$pg = $xml.Project.PropertyGroup | Where-Object { $_.ApplicationVersion } | Select-Object -First 1;" ^
  "$current = [int]$pg.ApplicationVersion;" ^
  "$next = $current + 1;" ^
  "$pg.ApplicationVersion = [string]$next;" ^
  "$pg.ApplicationDisplayVersion = '1.0.' + $next;" ^
  "$xml.Save($csproj);" ^
  "Write-Host ('  Version code : ' + $next);" ^
  "Write-Host ('  Display name : 1.0.' + $next);"

if %errorlevel% neq 0 (
    echo ERROR: Failed to increment version numbers.
    pause
    exit /b 1
)

echo.
echo Building Pestlook MAUI App for Android...
echo Output directory: %SCRIPT_DIR%bin\Release\net10.0-android\
echo.

dotnet publish -f net10.0-android -c Release

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Build failed!
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================
echo   Build Completed Successfully!
echo ========================================
echo.
echo Signed APK locations:
echo   - %SCRIPT_DIR%bin\Release\net10.0-android\com.pestlook.ui.mobile-Signed.apk
echo   - %SCRIPT_DIR%bin\Release\net10.0-android\publish\com.pestlook.ui.mobile-Signed.apk
echo.

set /p OPEN="Open output folder? (y/n): "
if /i "%OPEN%"=="y" (
    start explorer "%SCRIPT_DIR%bin\Release\net10.0-android\"
)

echo.
pause
