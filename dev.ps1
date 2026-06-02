# CinePlus Local Dev - Khởi động toàn bộ hệ thống local
# Chạy: .\dev.ps1
# Dừng: .\dev.ps1 stop

param([string]$Action = "start")

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Text)
    Write-Host "`n=> $Text" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Text)
    Write-Host "  [OK] $Text" -ForegroundColor Green
}

function Write-Err {
    param([string]$Text)
    Write-Host "  [!!] $Text" -ForegroundColor Red
}

if ($Action -eq "stop") {
    Write-Step "Dừng tất cả services..."
    docker compose down
    Write-Ok "Docker MySQL đã dừng"
    Write-Host "`nDev servers (nếu đang chạy trong terminal khác) cần Ctrl+C thủ công." -ForegroundColor Yellow
    exit 0
}

# ─── 1. Kiểm tra Docker ──────────────────────────────────────────────────────
Write-Step "Kiểm tra Docker..."
try {
    $dockerVersion = docker --version 2>&1
    Write-Ok $dockerVersion
} catch {
    Write-Err "Docker chưa được cài hoặc chưa chạy. Hãy mở Docker Desktop trước."
    exit 1
}

# ─── 2. Khởi động MySQL ──────────────────────────────────────────────────────
Write-Step "Khởi động MySQL local (Docker)..."
Set-Location $PSScriptRoot
docker compose up -d mysql
Write-Ok "Container MySQL đang khởi động..."

# ─── 3. Đợi MySQL sẵn sàng ──────────────────────────────────────────────────
Write-Step "Đợi MySQL sẵn sàng (tối đa 60 giây)..."
$maxWait = 60
$elapsed = 0
do {
    Start-Sleep -Seconds 3
    $elapsed += 3
    $health = docker inspect --format "{{.State.Health.Status}}" cineplus_mysql 2>&1
    Write-Host "  ... $elapsed s - status: $health" -ForegroundColor DarkGray
} while ($health -ne "healthy" -and $elapsed -lt $maxWait)

if ($health -ne "healthy") {
    Write-Err "MySQL chưa sẵn sàng sau $maxWait giây. Kiểm tra: docker logs cineplus_mysql"
    exit 1
}
Write-Ok "MySQL sẵn sàng!"

# ─── 4. Seed database nếu chưa có dữ liệu ───────────────────────────────────
Write-Step "Kiểm tra database (setup + seed)..."
Set-Location "$PSScriptRoot\apps\api"
try {
    $result = node scripts/setup-db.mjs 2>&1
    Write-Ok "Database đã được setup/seed xong"
} catch {
    Write-Err "Seed lỗi: $_"
    Write-Host "  (Có thể database đã có sẵn data - tiếp tục)" -ForegroundColor Yellow
}

# ─── 5. Hướng dẫn khởi động servers ─────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  MySQL local đang chạy tại: localhost:3306" -ForegroundColor Green
Write-Host "  DB: cineplus | User: cineplus | Pass: cineplus123" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Mở 2 terminal mới và chạy:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Terminal 1 (API - port 3001):" -ForegroundColor Cyan
Write-Host "    cd apps\api && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 2 (Admin - port 3000):" -ForegroundColor Cyan
Write-Host "    cd apps\admin && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Admin: http://localhost:3000" -ForegroundColor Magenta
Write-Host "  API:   http://localhost:3001/api/v1/health" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Tài khoản admin: admin@cineplus.local / Admin@123" -ForegroundColor Yellow
Write-Host ""
Write-Host "Để dừng MySQL: .\dev.ps1 stop" -ForegroundColor DarkGray
