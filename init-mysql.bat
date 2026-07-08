@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

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

if not exist "node_modules\" (
    echo [信息] 首次运行，正在安装依赖...
    call npm install --registry https://registry.npmmirror.com
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

echo [信息] 正在初始化 MySQL 数据表...
call npm run mysql:init
if errorlevel 1 (
    echo [错误] MySQL 初始化失败，请检查 .env 中的连接配置
    pause
    exit /b 1
)

echo.
echo [信息] 正在检查 MySQL 连接与表结构...
call npm run mysql:health
if errorlevel 1 (
    pause
    exit /b 1
)

echo.
echo [完成] MySQL 初始化成功
pause
