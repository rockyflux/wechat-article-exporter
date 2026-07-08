@echo off
chcp 65001 >nul
setlocal
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo [信息] 工作目录: %CD%
echo [信息] 正在检查运行环境...

where node >nul 2>&1
if errorlevel 1 (
    if exist "D:\soft\develop\nodejs\node.exe" (
        set "PATH=D:\soft\develop\nodejs;%PATH%"
    ) else (
        echo [错误] 未找到 Node.js，请先安装 Node.js 22+
        pause
        exit /b 1
    )
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 npm，请检查 Node.js 安装是否完整
    pause
    exit /b 1
)

netstat -ano 2>nul | findstr /R /C:":3000 .*LISTENING" >nul
if not errorlevel 1 (
    echo [提示] 开发服务器已在运行: http://localhost:3000/
    exit /b 0
)

if not exist "node_modules\" (
    echo [信息] 首次运行，正在安装依赖...
    call npm install --registry https://registry.npmmirror.com
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

echo [信息] 正在启动开发服务器（当前窗口输出日志）...
call npm run dev
if errorlevel 1 (
    echo [错误] 开发服务器启动失败，请检查上方日志
    pause
    exit /b 1
)
