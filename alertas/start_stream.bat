@echo off

REM Carpeta del proyecto
set "PROJECT_PATH=C:\Users\ruben\Desktop\Projects\para-twitch\alertas"

REM Carpeta de OBS
set "OBS_FOLDER=C:\Program Files\obs-studio\bin\64bit"

REM =============================
REM Levantar servidor Node.js en ventana separada
REM =============================
echo Iniciando servidor Node.js...
start "Servidor Node" cmd /k "cd /d "%PROJECT_PATH%" && node server.js"

REM =============================
REM Levantar OBS en otra ventana
REM =============================
echo Iniciando OBS Studio...
start "" cmd /c "cd /d "%OBS_FOLDER%" && obs64.exe"

echo =============================
echo Todo iniciado correctamente.
echo =============================
pause