MASTER PROMPT

You are a senior Windows systems engineer, Python developer, Windows COM/.NET interoperability expert, biometric systems engineer, and Next.js architect

> The Next.js application is already deployed to Vercel and serves users over HTTPS. The fingerprint subsystem must integrate with this deployed application without requiring changes to the deployment architecture.

---.

Your task is to completely redesign and rebuild the fingerprint subsystem for my project.

## PROJECT

School Library Management System

Authentication:

- Email
- Password
- Fingerprint MFA

Deployment target:

Windows 10  
Windows 11

Fingerprint scanner:

DigitalPersona U.are.U 4500

This is the ONLY scanner that matters.

Do NOT build a generic Linux-first abstraction.

Design specifically around this scanner.

The application is a Next.js application deployed on Vercel.

The browser cannot directly communicate with USB devices.

Therefore the local machine must run a bridge service.

---

# PRIMARY GOAL

I want a production-ready Windows fingerprint subsystem.

Not a proof of concept.

Not a Linux implementation.

Not placeholders.

Not TODOs.

Everything must actually work.

The application is already in production on Vercel.

Do not redesign the deployment architecture.

The fingerprint subsystem must integrate into the existing deployed application with minimal changes to the Next.js codebase.

Only redesign the local Windows biometric subsystem.

---

# DO NOT USE

Do NOT use

libfprint

PyGObject

GLib

Linux HID APIs

Linux USB APIs

udev

or anything Linux related.

Ignore Linux entirely.

This project is Windows only.

---

# REQUIRED ARCHITECTURE

The architecture should be

Browser

↓

Next.js Client

↓

Local Windows Bridge

↓

DigitalPersona SDK

↓

USB Scanner

The browser never communicates directly with USB.

The browser only communicates with localhost.

Example

[http://127.0.0.1:9876](http://127.0.0.1:9876)

---

# WINDOWS REQUIREMENTS

The bridge must use the official DigitalPersona SDK.

Do not fake it.

Do not stub it.

Implement real enrollment.

Implement real verification.

Implement actual device detection.

Implement actual fingerprint capture.

Implement actual template extraction.

Implement actual matching.

If Python cannot call the SDK directly,

use

pythonnet

or

pywin32

or

C#

or

a small .NET executable

whichever is the most reliable.

Choose reliability over simplicity.

---

# DEVICE DETECTION

Do NOT simply check if dpfpdd.dll exists.

Actually detect

DigitalPersona U.are.U 4500

connected over USB.

The bridge should know

connected

disconnected

busy

initializing

driver missing

SDK missing

multiple scanners connected

scanner unplugged while running

scanner reconnected

> The browser loads from the Vercel domain (HTTPS) but communicates with a trusted local bridge running on the same Windows machine. Design the bridge communication to work correctly with a remotely hosted web application, including any necessary CORS, HTTPS, or secure-origin considerations.

---

---

# BRIDGE API

The bridge must expose

GET /status

returns

connected

device name

serial number if available

SDK version

driver version

scanner health

POST /enroll

returns

template

quality score

capture count

status

POST /verify

returns

match

match score

capture quality

latency

POST /cancel

cancels enrollment

POST /restart

reloads scanner

GET /health

returns diagnostics

---

# BRIDGE REQUIREMENTS

No global mutable singleton.

Support reconnecting scanners.

Support unplugging scanners.

Support restarting scanner without restarting bridge.

No cached fake status.

No fake "connected = true".

---

# TEMPLATE STORAGE

Templates should NOT be stored in plaintext.

Encrypt them before saving.

Use authenticated encryption.

Do not invent crypto.

Use existing project encryption.

---

# LOGIN SECURITY

Current implementation trusts the client.

This is unacceptable.

The browser should never be able to say

"I verified successfully."

Instead

the bridge should generate a signed verification token

or

a nonce

that the server validates.

Fingerprint verification must be impossible to fake by calling a Server Action directly.

Close every authentication bypass.

---

# USER EXPERIENCE

Registration

Fill form

↓

Create user

↓

Detect scanner

↓

Guide user through enrollment

↓

Show progress

↓

Store encrypted template

↓

Done

Login

Email

↓

Password

↓

Scanner detected automatically

↓

User presses finger

↓

Verification

↓

Server validates

↓

JWT issued

↓

Dashboard

No manual refreshes.

No page reloads.

No hidden states.

---

# ENROLLMENT

Support

poor quality finger

finger moved

scanner timeout

duplicate finger

cancel

retry

quality feedback

progress indicator

successful enrollment

Store

template

SDK version

scanner model

timestamp

---

# VERIFICATION

Support

success

failure

timeout

cancel

quality too low

device disconnected

incorrect finger

Return

match

confidence

latency

quality

---

# WINDOWS SERVICE

The bridge should be installable as

Windows Service

or

Startup Application.

It should launch automatically when Windows starts.

Provide

installer

service registration

logging

graceful shutdown

automatic restart after crash

---

# LOGGING

Create structured logs.

Include

startup

device detection

SDK loading

scanner events

verification

errors

timeouts

USB disconnects

reconnects

Never log fingerprint templates.

---

# ERROR HANDLING

Every possible failure should produce meaningful errors.

No generic exceptions.

No

raise NotImplementedError

No TODOs.

No placeholders.

No

pass

No fake implementations.

---

# CODE STRUCTURE

Separate

Bridge Server

Scanner Driver

DigitalPersona SDK Wrapper

Encryption

HTTP Routes

Models

Utilities

Configuration

Logging

No giant bridge.py.

Small modules.

Clear interfaces.

---

# TESTING

Provide

unit tests

integration tests

mock scanner

real scanner tests

diagnostic mode

self-test endpoint

---

# DOCUMENTATION

Generate

architecture documentation

API documentation

installation guide

Windows setup guide

SDK installation guide

driver installation guide

deployment guide

troubleshooting guide

---

# WHAT TO REMOVE

Remove every Linux dependency.

Remove

libfprint

GLib

PyGObject

LinuxScanner

NoScanner fallback architecture

Linux package instructions

Linux permissions

Linux event loop

Linux detection logic

Everything should revolve around Windows.

---

# WHAT I EXPECT

I expect a production-ready Windows fingerprint subsystem specifically designed around the DigitalPersona U.are.U 4500.

The project should behave like commercial biometric software.

No placeholders.

No unfinished classes.

No fake status responses.

No hardcoded DLL checks.

No stub implementations.

No assumptions.

Everything must be fully implemented, production quality, and thoroughly documented.

---

**Don't use Python as the bridge if you don't have to.**

The DigitalPersona SDK is a Windows-native SDK and is much happier in the .NET ecosystem. A more robust architecture is:

```
Next.js (Browser)
        │
HTTP localhost
        │
Bridge Service (C#/.NET 8)
        │
DigitalPersona SDK
        │
U.are.U 4500 Scanner
```

C# has first-class support for Windows APIs, COM, DLL interop, Windows Services, installers, and the DigitalPersona ecosystem. I would choose **C#/.NET for the bridge** and keep Next.js only for the web application. It will be significantly easier to maintain, more reliable, and much closer to the way enterprise biometric software is typically built.
