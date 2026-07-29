@echo off
echo ===================================================
echo  Iniciando FacePhoto (Backend FastAPI + Tauri Desktop)
echo ===================================================
echo.
echo 1. Iniciando Servidor Backend FastAPI (Porta 8000)...
start "FacePhoto Backend (FastAPI)" .\.venv\Scripts\python.exe -m uvicorn src.backend.main:app --reload --port 8000

echo 2. Iniciando Aplicacao Desktop Tauri...
start "FacePhoto Desktop (Tauri)" npx tauri dev

echo.
echo Tudo pronto!
echo - Backend API: http://127.0.0.1:8000 (Swagger: http://127.0.0.1:8000/docs)
echo - Janela Desktop Tauri sendo aberta...
echo.
