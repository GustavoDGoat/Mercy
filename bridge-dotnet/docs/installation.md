# SLMS Fingerprint Bridge — Installation Guide

## Prerequisites

- Windows 10 or Windows 11 (64-bit)
- .NET 8 Runtime (download from https://dotnet.microsoft.com)
- Administrator access (for service installation)
- DigitalPersona U.are.U 4500 scanner (05ba:000a)

## Step 1: Install .NET 8 Runtime

```powershell
winget install Microsoft.DotNet.Runtime.8
```

## Step 2: Install DP SDK (for real scanning)

If you have the DigitalPersona One Touch SDK:

1. Run the DP SDK MSI installer from the scanner CD
2. Accept all defaults
3. Restart the computer if prompted

If you do NOT have the SDK, the bridge runs in mock mode — all endpoints work with simulated biometric data.

## Step 3: Copy Bridge Files

```powershell
# Clone or copy the bridge-dotnet directory to the kiosk
# Example:
mkdir C:\SLMS\bridge-dotnet
xcopy .\bridge-dotnet C:\SLMS\bridge-dotnet /E /I
```

## Step 4: Build the Bridge

```powershell
cd C:\SLMS\bridge-dotnet
dotnet restore src\Bridge.Host\Bridge.Host.csproj
dotnet publish src\Bridge.Host\Bridge.Host.csproj -c Release -r win-x64
```

## Step 5: Set Shared Secret

Create a file `bridge-secret.txt` in the `installer` directory:

```powershell
echo "your-shared-secret-key-here" > installer\bridge-secret.txt
```

This must match the `VERIFICATION_SECRET` environment variable on the Vercel server.

## Step 6: Install as Windows Service

```powershell
# Run as Administrator
powershell -ExecutionPolicy Bypass -File installer\setup.ps1 -Secret "your-shared-secret-key-here"
```

The service installs as `SLMSFingerprintBridge`, starts automatically on boot, and auto-restarts on crash.

## Step 7: Verify

```powershell
# Test the bridge
curl http://127.0.0.1:9876/status

# Expected output (mock mode):
# {"connected":true,"mode":"Mock","device":{"name":"Mock Scanner ..."}}

# Full diagnostic
curl http://127.0.0.1:9876/diagnostic
```

## Managing the Service

```powershell
sc.exe start  SLMSFingerprintBridge   # Start
sc.exe stop   SLMSFingerprintBridge   # Stop
sc.exe query  SLMSFingerprintBridge   # Check status
```

## Uninstalling

```powershell
powershell -ExecutionPolicy Bypass -File installer\setup.ps1 -Uninstall
```
