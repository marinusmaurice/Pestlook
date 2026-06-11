@echo off
REM Build and publish signed Android APK
REM This script builds the Pestlook MAUI app in Release mode with signing

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Pestlook Android APK Builder
echo ========================================
echo.

REM Get the current directory
set SCRIPT_DIR=%~dp0

echo Building Pestlook MAUI App for Android...
echo Output directory: %SCRIPT_DIR%bin\Release\net10.0-android\
echo.

REM Run the publish command
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

REM Ask if user wants to open the output folder
set /p OPEN="Open output folder? (y/n): "
if /i "%OPEN%"=="y" (
	start explorer "%SCRIPT_DIR%bin\Release\net10.0-android\"
)

echo.
pause
