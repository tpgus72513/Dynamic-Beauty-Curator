$ErrorActionPreference = 'Stop'

$frontendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repoRoot = (Resolve-Path (Join-Path $frontendRoot '..')).Path
$backendRoot = Join-Path $repoRoot 'backend'
$pythonPath = Join-Path $repoRoot '.venv\Scripts\python.exe'
$viteEntry = Join-Path $frontendRoot 'node_modules\vite\bin\vite.js'
$playwrightCommand = Join-Path $frontendRoot 'node_modules\.bin\playwright.cmd'
$nodePath = (Get-Command node.exe).Source
$startedProcesses = @()
$testExitCode = 1

function Test-ServerUrl([string]$Url) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Wait-ServerUrl([string]$Url, [int]$TimeoutSeconds, $Process) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-ServerUrl $Url) { return }
    if ($Process -and $Process.HasExited) {
      throw "서버가 준비되기 전에 종료되었습니다: $Url"
    }
    Start-Sleep -Milliseconds 500
  }
  throw "서버 준비 시간이 초과되었습니다: $Url"
}

if (-not (Test-Path -LiteralPath $pythonPath)) {
  throw "백엔드 가상환경을 찾을 수 없습니다: $pythonPath"
}
if (-not (Test-Path -LiteralPath $playwrightCommand)) {
  throw 'Playwright가 설치되지 않았습니다. npm.cmd install 을 먼저 실행하세요.'
}

try {
  $backendProcess = $null
  if (-not (Test-ServerUrl 'http://127.0.0.1:8000/')) {
    $backendProcess = Start-Process -FilePath $pythonPath `
      -ArgumentList @('-m', 'uvicorn', 'main:app', '--app-dir', 'app', '--host', '127.0.0.1', '--port', '8000') `
      -WorkingDirectory $backendRoot -WindowStyle Hidden -PassThru
    $startedProcesses += $backendProcess
  }
  Wait-ServerUrl 'http://127.0.0.1:8000/' 120 $backendProcess

  $frontendProcess = $null
  if (-not (Test-ServerUrl 'http://127.0.0.1:5173/')) {
    $frontendProcess = Start-Process -FilePath $nodePath `
      -ArgumentList @("`"$viteEntry`"", '--host', '127.0.0.1', '--port', '5173') `
      -WorkingDirectory $frontendRoot -WindowStyle Hidden -PassThru
    $startedProcesses += $frontendProcess
  }
  Wait-ServerUrl 'http://127.0.0.1:5173/' 60 $frontendProcess

  Push-Location $frontendRoot
  try {
    & $playwrightCommand test
    $testExitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }
} catch {
  Write-Error $_
  $testExitCode = 1
} finally {
  for ($index = $startedProcesses.Count - 1; $index -ge 0; $index--) {
    $process = $startedProcesses[$index]
    if ($process -and -not $process.HasExited) {
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
      Wait-Process -Id $process.Id -Timeout 10 -ErrorAction SilentlyContinue
    }
  }
}

exit $testExitCode
