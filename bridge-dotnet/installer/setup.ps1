# SLMS Fingerprint Bridge — Windows Service Installer
# Run as Administrator:
#   powershell -ExecutionPolicy Bypass -File setup.ps1

param(
    [string]$Secret = "",
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$ServiceName = "SLMSFingerprintBridge"
$DisplayName = "SLMS Fingerprint Bridge"
$BridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ExePath = Join-Path $BridgeDir "..\src\Bridge.Host\bin\Release\net8.0-windows\win-x64\publish\Bridge.Host.exe"

if ($Uninstall) {
    Write-Host "Uninstalling $ServiceName..."
    sc.exe stop $ServiceName 2>$null
    sc.exe delete $ServiceName 2>$null
    Write-Host "Service removed."
    exit 0
}

if (-not $Secret) {
    Write-Host "ERROR: -Secret parameter is required." -ForegroundColor Red
    Write-Host "Usage: setup.ps1 -Secret 'your-shared-secret-here'" -ForegroundColor Yellow
    exit 1
}

Write-Host "=== SLMS Fingerprint Bridge Setup ===" -ForegroundColor Cyan

# Step 1: Save shared secret
$SecretFile = Join-Path $BridgeDir "bridge-secret.txt"
$Secret | Out-File -FilePath $SecretFile -Encoding ASCII -NoNewline
Write-Host "[OK] Shared secret saved to bridge-secret.txt"

# Step 2: Remove existing service if present
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Stopping existing service..."
    sc.exe stop $ServiceName 2>$null
    Start-Sleep -Seconds 2
    sc.exe delete $ServiceName
    Start-Sleep -Seconds 1
}

# Step 3: Create Windows Service
Write-Host "Installing Windows Service..."
$binPath = "`"$ExePath`""
sc.exe create $ServiceName binPath= $binPath start= auto DisplayName= "$DisplayName"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: sc.exe failed with exit code $LASTEXITCODE" -ForegroundColor Red
    Write-Host "Make sure you built the bridge first: dotnet publish -c Release" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Service created: $ServiceName"

# Step 4: Set recovery options
sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/10000/restart/30000
Write-Host "[OK] Recovery: auto-restart on crash"

# Step 5: Start the service
sc.exe start $ServiceName
Start-Sleep -Seconds 3
$status = sc.exe query $ServiceName
Write-Host "[OK] Service started"
Write-Host "$status"

# Step 6: Test the bridge
Write-Host "Testing bridge at http://127.0.0.1:9876/status ..."
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:9876/status" -UseBasicParsing -TimeoutSec 5
    Write-Host "[OK] Bridge is responding: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Bridge not responding yet. Check logs in $BridgeDir\logs\" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "Service: $ServiceName"
Write-Host "Port: 9876"
Write-Host "Secret file: $SecretFile"
Write-Host ""
Write-Host "Use: sc.exe start $ServiceName   (start)"
Write-Host "     sc.exe stop $ServiceName    (stop)"
Write-Host "     sc.exe query $ServiceName   (status)"
