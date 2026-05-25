@echo off
cd /d "%~dp0"
set "NPM=%ProgramFiles%\nodejs\npm.cmd"
if not exist "%NPM%" set "NPM=npm.cmd"
if not exist node_modules (
  echo [dashboard] npm install ...
  call "%NPM%" install
)
echo [dashboard] npm start
call "%NPM%" start
