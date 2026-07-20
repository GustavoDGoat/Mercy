# Digital Persona SDK Setup Guide

## What is the DP SDK?

The DigitalPersona One Touch SDK is the official Windows SDK for the U.are.U 4500 fingerprint scanner. It provides:

- USB device drivers (dpfpdd.dll)
- Fingerprint capture engine (DPFP.Capture)
- Template extraction engine (DPFP.Processing.Enrollment)
- Matching/verification engine (DPFP.Verification.Verification)
- .NET wrapper assemblies

## How to Obtain

The SDK is distributed by HID Global. Access requires registration:

1. Go to https://www.hidglobal.com/support
2. Search for "DigitalPersona One Touch SDK"
3. Register for a developer account if required
4. Download the SDK installer (typically named `DigitalPersonaOneTouchForWindowsSDK.msi`)

**Alternative**: The SDK is also bundled on the CD that ships with the U.are.U 4500 scanner.

## Installation

1. Run the MSI installer
2. Accept all default options
3. Restart the computer
4. Verify installation:
   ```
   dir "C:\Program Files\DigitalPersona\Bin\DotNet\DPFPCtlX.dll"
   ```

## What Happens Without the SDK

If the DP SDK is not installed:

- The bridge detects this at startup
- It falls back to `MockScannerService` mode
- All API endpoints work, but fingerprint data is simulated
- Real biometric capture and matching are unavailable
- The diagnostic endpoint reports: `"DP SDK": { "passed": false }`

## Installing the SDK on a New Kiosk

After installing the SDK on a kiosk:

1. The bridge auto-detects it on next restart
2. The bridge switches from MockScanner to DpSdkScanner
3. Real fingerprints can now be captured and verified
4. No configuration changes needed — same bridge, same port, same API

## SDK Required Files

The bridge specifically expects these files:

| File | Purpose |
|------|---------|
| `DPFPCtlX.dll` | Capture control (device communication) |
| `DPFPEngX.dll` | Processing engine (minutiae extraction) |
| `DPFPVerX.dll` | Verification engine (matching) |
| `DPFPDevX.dll` | Device enumeration and management |

These are installed by the SDK MSI and registered as COM objects on the system.
