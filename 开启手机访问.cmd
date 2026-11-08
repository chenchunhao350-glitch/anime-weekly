@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 动漫周刊 - 手机访问
echo 手机访问开启后，请保持此窗口和电脑运行。
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\setup-mobile.ps1"
pause
