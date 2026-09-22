@echo off
title PRAVAAH 4.0 — Operations Backend Server
echo ========================================================
echo   Starting PRAVAAH 4.0 Express Operations Backend...
echo   Port: 5000 ^| Health: http://localhost:5000/health
echo ========================================================
echo.
cd backend
if not exist node_modules (
  echo Installing backend dependencies...
  call npm install
)
call npm start
pause
