$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeDir = Join-Path $projectRoot ".tools\node-v22.22.2-win-x64"

if (!(Test-Path (Join-Path $nodeDir "node.exe"))) {
  throw "Chưa tìm thấy Node 22 trong .tools. Hãy tải/cài Node 22 trước khi chạy script này."
}

$env:Path = "$nodeDir;$env:Path"
Write-Host "Đã dùng Node $(node -v) và npm $(npm -v) cho phiên PowerShell hiện tại."
