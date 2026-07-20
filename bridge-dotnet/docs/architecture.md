# SLMS Fingerprint Bridge — Architecture

## Overview

The fingerprint bridge is a local Windows service that bridges the Vercel-hosted Next.js application with a physical DigitalPersona U.are.U 4500 fingerprint scanner over USB.

```
Next.js (Vercel)  ←HTTPS→  Browser  ←HTTP localhost:9876→  C# Bridge  ←USB→  DP 4500 Scanner
```

## Components

```
bridge-dotnet/
├── src/Bridge.Host/
│   ├── Program.cs              Entry point, HTTP route definitions
│   ├── Scanners/
│   │   ├── IScannerService.cs  Interface: EnrollAsync, VerifyAsync, Cancel, Restart, GetStatus, GetHealth
│   │   ├── MockScannerService.cs  Mock implementation (works without DP SDK)
│   │   └── ScannerFactory.cs   Factory: detects SDK at startup, returns MockScanner or DpSdkScanner
│   ├── Models/Models.cs        All request/response DTOs
│   ├── Security/
│   │   └── VerificationSigner.cs  HMAC-SHA256 token signing for server-side validation
│   ├── Logging/
│   │   └── BridgeLogger.cs     Structured JSON logging (never logs templates)
│   └── Diagnostics/
│       └── SystemChecks.cs     SDK detection, crypto readiness checks
├── tests/                      Unit tests (xUnit)
└── installer/
    └── setup.ps1               Windows Service installation script
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /status | Scanner presence, device info, mode, uptime |
| POST | /enroll | Fingerprint enrollment (returns template + quality) |
| POST | /verify | Fingerprint verification (returns match + signed token) |
| POST | /cancel | Cancel in-progress scan |
| POST | /restart | Reload scanner (simulates unplug/replug) |
| GET | /health | SDK, scanner, crypto status |
| GET | /diagnostic | Full self-test with pass/fail checks |

## Security

- **Templates**: Encrypted server-side (AES-256-GCM) on Vercel before storage. Bridge receives plaintext templates (already decrypted by server).
- **Verification tokens**: Bridge signs each successful match with HMAC-SHA256(userId + timestamp + result, shared secret). Server validates before issuing JWT. Browser never sees the secret.
- **Token window**: 60 seconds — prevents replay attacks.

## Operation Modes

| Mode | When | Behavior |
|------|------|----------|
| Real | DP SDK detected at startup | Uses DpSdkScannerService, real USB capture and matching |
| Mock | DP SDK not installed | Uses MockScannerService, simulated scans for development/demo |
