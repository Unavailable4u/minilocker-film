@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem ============================================================================================================
rem  MiniLocker film: voice-over with Kyutai Pocket TTS (local, CPU only), synced to the frame.
rem
rem    make-voice.bat                  voice "jane", writes public\audio\voice.wav, refreshes the audio manifest
rem    make-voice.bat marius           another built-in voice (alba, anna, azelma, charles, eve, george, jane, mary, ...)
rem    make-voice.bat "C:\me\my.wav"   clone any voice from a wav/mp3 sample (about 5 seconds is enough)
rem    make-voice.bat jane render      ...and then render the film:   npm run render
rem    make-voice.bat jane sample      ...and then a test render:     npm run render -- --allow-sample
rem
rem  The text and the start frames come from voiceBlocks in src\config\copy.ts. Edit the text there, run this again.
rem ============================================================================================================

set "VOICE=%~1"
if "%VOICE%"=="" set "VOICE=jane"
set "MODE=%~2"

where node >nul 2>nul || ( echo ERROR: Node is not installed. Fix: install Node 20 or newer from https://nodejs.org & goto :fail )
where ffmpeg >nul 2>nul || ( echo ERROR: ffmpeg is not on PATH. Fix: winget install Gyan.FFmpeg , then open a NEW terminal & goto :fail )
if not exist node_modules ( echo Installing the film's npm packages... & call npm install || goto :fail )

echo.
echo === 1/3  Generating the voice "%VOICE%" with Pocket TTS ===
where uv >nul 2>nul
if %errorlevel%==0 (
  uv run --python 3.12 --with pocket-tts python scripts\make-voice.py --voice "%VOICE%" || goto :fail
) else (
  where python >nul 2>nul || ( echo ERROR: neither uv nor Python was found. Fix: winget install astral-sh.uv , then open a NEW terminal & goto :fail )
  if not exist .venv-voice\Scripts\python.exe (
    echo Creating .venv-voice and installing pocket-tts, one time only...
    python -m venv .venv-voice || goto :fail
    .venv-voice\Scripts\python -m pip install --upgrade pip pocket-tts || goto :fail
  )
  .venv-voice\Scripts\python scripts\make-voice.py --voice "%VOICE%" || goto :fail
)

echo.
echo === 2/3  Telling the film the voice exists: npm run sfx ===
call npm run sfx || goto :fail

echo.
echo === 3/3  Render ===
if /i "%MODE%"=="render" ( call npm run render || goto :fail & goto :done )
if /i "%MODE%"=="sample" ( call npm run render -- --allow-sample || goto :fail & goto :done )
echo Skipped. To render now:  npm run render        (or a test render:  npm run render -- --allow-sample)
echo To check the timing first: type out\voice-timing.txt

:done
echo.
echo Done. Voice file: public\audio\voice.wav   Timing report: out\voice-timing.txt
if exist out\minilocker-demo.mp4 echo Video: out\minilocker-demo.mp4
endlocal
exit /b 0

:fail
echo.
echo Stopped. Read the ERROR line above; it says what to fix.
endlocal
exit /b 1
