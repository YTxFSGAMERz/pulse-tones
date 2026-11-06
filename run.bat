@echo off
title PulseTones Launcher
cd /d "%~dp0"
echo ========================================================
echo  PulseTones - Presage SmartSpectra Bio-Acoustic Engine
echo ========================================================
echo.
echo Building bundle...
call npm run build
echo.
echo Launching PulseTones on your desktop...
call npx electron .
pause
