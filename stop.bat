@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "found=0"
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do (
    set "found=1"
    echo [信息] 正在停止进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

if "!found!"=="0" (
    echo [提示] 未发现运行中的开发服务器 (端口 3000)
) else (
    echo [完成] 开发服务器已停止
)

pause
