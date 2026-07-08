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

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [提示] 开发服务器已在运行: http://localhost:3000/  (PID: %%a)
    pause
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

echo [信息] 正在启动开发服务器...
start "wechat-article-exporter" cmd /k "cd /d "%~dp0" && npm run dev"
echo [完成] 已在新窗口启动，访问 http://localhost:3000/
timeout /t 3 >nul
