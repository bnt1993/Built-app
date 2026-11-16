@echo off
setlocal
cd /d "%~dp0"
rem Keep the original extensionless source and refresh only its generated HTML copy.
if exist "Checking" (
  copy /y "Checking" "Checking.html" >nul
  if errorlevel 1 (
    echo Cannot prepare Checking.html. Close the file or check folder permissions.
    pause
    exit /b 1
  )
)
if not exist "HTML_Hub.html" (
  echo HTML_Hub.html is missing. Extract the complete repository ZIP first.
  pause
  exit /b 1
)
start "" "%~dp0HTML_Hub.html"
endlocal
