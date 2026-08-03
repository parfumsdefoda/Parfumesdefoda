@echo off
title Push Updates to GitHub

echo ================================
echo   Pushing updates to GitHub...
echo ================================
echo.

REM Go to the project folder (where this file is located)
cd /d "%~dp0"

REM Stage all changed files
git add .

REM Ask for a commit message (or use a default one)
set "commitMsg="
set /p commitMsg="Enter update message (or press Enter for default): "

if "%commitMsg%"=="" (
    set "commitMsg=Update %date% %time%"
)

git commit -m "%commitMsg%"

REM Push the updates
git push

echo.
echo ================================
echo         Done! Pushed OK
echo ================================
echo.
pause
