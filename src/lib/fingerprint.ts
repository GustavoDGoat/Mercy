"use client"

const BRIDGE_URL = process.env.NEXT_PUBLIC_FINGERPRINT_BRIDGE_URL || "http://localhost:9876"

export interface DeviceInfo {
  name: string
  vendor_id: string
  product_id: string
  serial: string
  driver_version: string
  sdk_version: string
}

export interface ScannerStatus {
  connected: boolean
  mode: string
  state: string
  device: DeviceInfo
  uptime_seconds: number
  error?: string
}

export interface EnrollResult {
  template: string
  platform: string
  quality_score: number
  capture_count: number
  status: string
}

export interface VerifyResult {
  match: boolean
  score: number
  latency_ms: number
  quality: number
  verification_token?: string
  user_id?: string
  timestamp?: string
  error?: string
}

export interface HealthReport {
  mode: string
  sdk_installed: boolean
  scanner_connected: boolean
  secret_configured: boolean
}

export interface DiagnosticReport {
  timestamp: string
  mode: string
  checks: { name: string; passed: boolean; detail: string }[]
  all_passed: boolean
}

async function fetchBridge<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BRIDGE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `Bridge error: ${res.status}`)
  }

  return data as T
}

export async function checkScannerStatus(): Promise<ScannerStatus> {
  try {
    return await fetchBridge<ScannerStatus>("/status")
  } catch {
    return {
      connected: false,
      mode: "unknown",
      state: "offline",
      device: { name: "", vendor_id: "", product_id: "", serial: "", driver_version: "", sdk_version: "" },
      uptime_seconds: 0,
      error: "Scanner service unreachable"
    }
  }
}

export async function enrollFingerprint(): Promise<EnrollResult> {
  return fetchBridge<EnrollResult>("/enroll", { method: "POST" })
}

export async function verifyFingerprint(
  template: string,
  platform: string
): Promise<VerifyResult> {
  return fetchBridge<VerifyResult>("/verify", {
    method: "POST",
    body: JSON.stringify({ template, platform }),
  })
}

export async function cancelScan(): Promise<void> {
  await fetchBridge<{ status: string }>("/cancel", { method: "POST" })
}

export async function restartScanner(): Promise<ScannerStatus> {
  return fetchBridge<ScannerStatus>("/restart", { method: "POST" })
}

export async function getHealth(): Promise<HealthReport> {
  return fetchBridge<HealthReport>("/health")
}

export async function getDiagnostic(): Promise<DiagnosticReport> {
  return fetchBridge<DiagnosticReport>("/diagnostic")
}
