@echo off
title PRAVAAH — Live Train ETA Intelligence
echo ========================================================
echo   PRAVAAH: ETS Intelligent Railway Operations Platform
echo   Powered by Express API + XGBoost + Live Weather
echo ========================================================
echo.
echo Opening PRAVAAH Frontend in your browser...
if exist frontend\index.html (
  start frontend\index.html
) else (
  start index.html
)
echo.
echo Website launched! You can also start the backend server by running start_backend.bat
pause
