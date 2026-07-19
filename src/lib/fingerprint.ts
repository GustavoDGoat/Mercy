"use client"

const BRIDGE_URL = process.env.NEXT_PUBLIC_FINGERPRINT_BRIDGE_URL || "http://localhost:9876"

export interface ScannerStatus {
  connected: boolean
  platform?: string
  device?: string
  reason?: string
  error?: string
}

export interface EnrollResult {
  template: string
  platform: string
}

export interface VerifyResult {
  match: boolean
  score: number
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
    return { connected: false, error: "Scanner service unreachable" }
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
