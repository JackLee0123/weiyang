# 一键：装依赖 → 拉课表 → 打包 rpk（Windows）
#
#   powershell -ExecutionPolicy Bypass -File scripts\build-with-sync.ps1
#
# 首次运行会打印 6 位连接码，去网页端「设备连接」里确认即可。

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw '没找到 Node.js，请先安装 Node.js 18 或更高版本：https://nodejs.org/'
}

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) { $npm = Get-Command npm -ErrorAction SilentlyContinue }
if (-not $npm) { throw '没找到 npm，请重新安装 Node.js' }

Write-Host '==> 1/3 安装依赖（只需第一次，慢一些）'
if (Test-Path 'node_modules') {
  Write-Host '    node_modules 已存在，跳过'
} else {
  & $npm.Source install
}

Write-Host '==> 2/3 同步课表'
& $npm.Source run sync

Write-Host '==> 3/3 打包 rpk'
& $npm.Source run build

$rpk = Get-ChildItem 'dist\*.rpk' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Write-Host ''
Write-Host ('完成：' + $rpk.FullName)
Write-Host '接下来打开 AstroBox，把上面这个 rpk 推送到手环。'
