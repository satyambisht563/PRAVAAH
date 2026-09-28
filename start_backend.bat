@echo off
title PRAVAAH — Operations Backend Server
echo ========================================================
echo   Starting PRAVAAH Express Operations Backend...
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
