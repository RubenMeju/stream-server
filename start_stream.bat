@echo off
REM =============================
REM Configuración de carpetas
REM =============================
set "PROJECT_PATH=C:\Users\ruben\Desktop\Projects\twitch\alertas"
set "OBS_PATH=C:\Program Files\obs-studio\bin\64bit\obs64.exe"

REM =============================
REM Levantar servidor Node.js en ventana separada
REM =============================
echo Iniciando servidor Node.js...
start "Servidor Node" cmd /k "cd /d "%PROJECT_PATH%" && node server.js && echo. && echo Presiona cualquier tecla aqui cuando hayas terminado la configuración de ngrok y tokens... && pause"

REM =============================
REM Espera a que configures ngrok y tokens
REM =============================
echo Esperando a que completes la configuracion en la ventana de Node...
pause

REM =============================
REM Abrir OBS directamente
REM =============================
echo Iniciando OBS Studio...
start "" "%OBS_PATH%"

echo =============================
echo Todo iniciado correctamente.
echo =============================
pause