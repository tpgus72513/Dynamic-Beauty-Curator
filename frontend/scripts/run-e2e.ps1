$ErrorActionPreference = 'Stop'

$frontendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repoRoot = (Resolve-Path (Join-Path $frontendRoot '..')).Path
$backendRoot = Join-Path $repoRoot 'backend'
$pythonPath = Join-Path $repoRoot '.venv\Scripts\python.exe'
$viteEntry = Join-Path $frontendRoot 'node_modules\vite\bin\vite.js'
$playwrightCommand = Join-Path $frontendRoot 'node_modules\.bin\playwright.cmd'
$nodePath = (Get-Command node.exe).Source
$backendPort = 18000
$frontendPort = 15173
$backendUrl = "http://127.0.0.1:$backendPort"
$frontendUrl = "http://127.0.0.1:$frontendPort"
$startedProcesses = @()
$testExitCode = 1
$previousCorsOrigins = $env:CORS_ORIGINS
$previousProxyTarget = $env:VITE_PROXY_TARGET
$previousE2eBaseUrl = $env:E2E_BASE_URL

function Test-TcpPort([int]$Port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $connectTask = $client.ConnectAsync('127.0.0.1', $Port)
    return $connectTask.Wait(500) -and $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Test-AppUrl([string]$Url, [ValidateSet('backend', 'frontend')] [string]$Kind) {
  try {
    if ($Kind -eq 'backend') {
      $body = Invoke-RestMethod -Uri $Url -TimeoutSec 3
      return (
        $body.status -eq 'ok' -and
        $body.service -eq 'Dynamic Beauty Curator API' -and
        $body.model.ready -eq $true -and
        $body.model.name -eq 'efficientnetb2_skin_multitask' -and
        $body.model.version -eq 'e835bb5686ff'
      )
    }

    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
    return $response.StatusCode -eq 200 -and $response.Content.Contains('<title>Dynamic Beauty Curator</title>')
  } catch {
    return $false
  }
}

function Wait-AppUrl(
  [string]$Url,
  [ValidateSet('backend', 'frontend')] [string]$Kind,
  [int]$TimeoutSeconds,
  $Process
) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-AppUrl $Url $Kind) { return }
    if ($Process -and $Process.HasExited) {
      throw "서버가 준비되기 전에 종료되었습니다: $Url"
    }
    Start-Sleep -Milliseconds 500
  }
  throw "서버 준비 시간이 초과되었습니다: $Url"
}

function Restore-Environment([string]$Name, $Value) {
  if ($null -eq $Value) {
    Remove-Item -Path "Env:$Name" -ErrorAction SilentlyContinue
  } else {
    Set-Item -Path "Env:$Name" -Value $Value
  }
}

if (-not (Test-Path -LiteralPath $pythonPath)) {
  throw "백엔드 가상환경을 찾을 수 없습니다: $pythonPath"
}
if (-not (Test-Path -LiteralPath $playwrightCommand)) {
  throw 'Playwright가 설치되지 않았습니다. npm.cmd install 을 먼저 실행하세요.'
}
if (Test-TcpPort $backendPort) {
  throw "E2E 전용 백엔드 포트가 이미 사용 중입니다: $backendPort"
}
if (Test-TcpPort $frontendPort) {
  throw "E2E 전용 프론트엔드 포트가 이미 사용 중입니다: $frontendPort"
}

try {
  $env:CORS_ORIGINS = $frontendUrl
  $backendProcess = Start-Process -FilePath $pythonPath `
    -ArgumentList @('-m', 'uvicorn', 'main:app', '--app-dir', 'app', '--host', '127.0.0.1', '--port', "$backendPort") `
    -WorkingDirectory $backendRoot -WindowStyle Hidden -PassThru
  $startedProcesses += $backendProcess
  Wait-AppUrl $backendUrl 'backend' 120 $backendProcess

  $env:VITE_PROXY_TARGET = $backendUrl
  $frontendProcess = Start-Process -FilePath $nodePath `
    -ArgumentList @("`"$viteEntry`"", '--host', '127.0.0.1', '--port', "$frontendPort", '--strictPort') `
    -WorkingDirectory $frontendRoot -WindowStyle Hidden -PassThru
  $startedProcesses += $frontendProcess
  Wait-AppUrl $frontendUrl 'frontend' 60 $frontendProcess

  $env:E2E_BASE_URL = $frontendUrl
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
  Restore-Environment 'CORS_ORIGINS' $previousCorsOrigins
  Restore-Environment 'VITE_PROXY_TARGET' $previousProxyTarget
  Restore-Environment 'E2E_BASE_URL' $previousE2eBaseUrl
}

exit $testExitCode
