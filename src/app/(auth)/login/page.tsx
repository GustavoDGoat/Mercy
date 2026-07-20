"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Fingerprint, Loader2, Shield, Check, X, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { login, verifyMfa } from "./actions"
import { checkScannerStatus, verifyFingerprint, restartScanner, type ScannerStatus } from "@/lib/fingerprint"

type MfaState = "checking" | "no_scanner" | "no_fingerprint" | "platform_mismatch" | "ready" | "scanning" | "match" | "no_match" | "locked"

const MAX_ATTEMPTS = 3
const LOCKOUT_MS = 5 * 60 * 1000

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<"credentials" | "mfa">("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [fpTemplate, setFpTemplate] = useState<string | null>(null)
  const [fpPlatform, setFpPlatform] = useState<string | null>(null)
  const [mfaState, setMfaState] = useState<MfaState>("checking")
  const [attempts, setAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState(0)
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>({
    connected: false,
    mode: "unknown",
    state: "offline",
    device: { name: "", vendor_id: "", product_id: "", serial: "", driver_version: "", sdk_version: "" },
    uptime_seconds: 0,
  })

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await login(email, password)
      if (result.error) {
        setError(result.error)
        return
      }
      setUserId(result.userId!)
      if (!result.hasFingerprint || !result.fingerprintTemplate) {
        setMfaState("no_fingerprint")
        setStep("mfa")
        return
      }
      setFpTemplate(result.fingerprintTemplate)
      setFpPlatform(result.fingerprintPlatform)
      setStep("mfa")
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (step !== "mfa") return
    if (mfaState === "no_fingerprint") return

    let cancelled = false

    async function initScanner() {
      setMfaState("checking")
      const status = await checkScannerStatus()
      if (cancelled) return
      setScannerStatus(status)

      if (!status.connected) {
        setMfaState("no_scanner")
        return
      }

      if (fpPlatform && fpPlatform !== "win_dpsdk") {
        setMfaState("platform_mismatch")
        return
      }

      setMfaState("ready")
    }

    initScanner()
    return () => { cancelled = true }
  }, [step])

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_MS
      setLockoutUntil(until)
      setMfaState("locked")
      const timer = setTimeout(() => {
        setAttempts(0)
        setLockoutUntil(0)
        setMfaState("ready")
        setError("")
      }, LOCKOUT_MS)
      return () => clearTimeout(timer)
    }
  }, [attempts])

  async function handleFingerprintScan() {
    if (!userId || !fpTemplate || !fpPlatform) return
    if (mfaState === "locked" || mfaState === "scanning" || mfaState === "match") return

    setMfaState("scanning")
    setError("")

    try {
      const result = await verifyFingerprint(fpTemplate, fpPlatform)
      if (result.match) {
        setMfaState("match")
        await new Promise((r) => setTimeout(r, 800))
        const mfaResult = await verifyMfa(
          userId,
          result.verification_token,
          result.timestamp
        )
        if (mfaResult.error) {
          setError(mfaResult.error)
          setMfaState("ready")
          return
        }
        router.push("/dashboard")
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        if (newAttempts < MAX_ATTEMPTS) {
          setMfaState("no_match")
          setError(`Fingerprint does not match. Attempt ${newAttempts} of ${MAX_ATTEMPTS}.`)
          setTimeout(() => {
            setMfaState("ready")
            setError("")
          }, 1500)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fingerprint verification failed"
      if (msg.includes("busy") || msg.includes("409")) {
        setError("Scanner busy — resetting...")
        try { await restartScanner() } catch { }
        await new Promise((r) => setTimeout(r, 2000))
        setError("")
        setMfaState("ready")
        return
      }
      setError(msg)
      setMfaState("ready")
    }
  }

  function handleRetryScanner() {
    if (step !== "mfa") return
    let cancelled = false
    async function retry() {
      setMfaState("checking")
      const status = await checkScannerStatus()
      if (cancelled) return
      setScannerStatus(status)
      if (!status.connected) {
        setMfaState("no_scanner")
        return
      }
      if (fpPlatform && fpPlatform !== "win_dpsdk") {
        setMfaState("platform_mismatch")
        return
      }
      setMfaState("ready")
    }
    retry()
    return () => { cancelled = true }
  }

  function getMfaMessage(): string {
    switch (mfaState) {
      case "checking": return "Connecting to fingerprint scanner..."
      case "no_scanner": return scannerStatus.error || "Scanner not detected. Ensure the USB scanner is connected."
      case "no_fingerprint": return "No fingerprint registered. Please contact a librarian to enroll your fingerprint."
      case "platform_mismatch": return `Your fingerprint was registered on a '${fpPlatform}' kiosk. Please use the same type of kiosk.`
      case "ready": return "Place your finger on the scanner"
      case "scanning": return "Reading fingerprint..."
      case "match": return "Identity verified! Redirecting..."
      case "no_match": return ""
      case "locked": return `Too many failed attempts. Try again in ${Math.ceil((lockoutUntil - Date.now()) / 1000 / 60)} minute(s).`
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 border-accent/20">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <Shield className="w-8 h-8 text-accent" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            LAUTECH Library
          </CardTitle>
          <CardDescription className="text-base">
            Secure Library Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@lautech.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center bg-destructive/10 py-2 rounded">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Multi-factor authentication will be required after sign in.
              </p>
              <p className="text-xs text-center text-muted-foreground">
                Don&apos;t have an account?{" "}
                <a href="/register" className="text-primary hover:underline font-medium">Register as Student</a>
              </p>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div>
                <p className="font-semibold text-lg text-primary">Biometric Verification</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {getMfaMessage()}
                </p>
              </div>

              {mfaState === "checking" && (
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-muted border-2 border-muted-foreground/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  </div>
                </div>
              )}

              {mfaState === "no_scanner" && (
                <div className="space-y-4">
                  <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center">
                      <WifiOff className="w-8 h-8 text-destructive" />
                    </div>
                  </div>
                  <Button onClick={handleRetryScanner} size="sm" variant="outline">
                    <Wifi className="w-4 h-4 mr-2" /> Retry
                  </Button>
                </div>
              )}

              {mfaState === "no_fingerprint" && (
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-yellow-500/10 border-2 border-yellow-500 flex items-center justify-center">
                    <Fingerprint className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              )}

              {mfaState === "platform_mismatch" && (
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-yellow-500/10 border-2 border-yellow-500 flex items-center justify-center">
                    <X className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              )}

              {(mfaState === "ready" || mfaState === "no_match" || mfaState === "locked") && (
                <button
                  type="button"
                  onClick={handleFingerprintScan}
                  disabled={mfaState === "locked"}
                  className="relative mx-auto w-24 h-24 flex items-center justify-center"
                >
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                      mfaState === "no_match"
                        ? "bg-destructive/10 border-2 border-destructive"
                        : mfaState === "locked"
                        ? "bg-destructive/10 border-2 border-destructive"
                        : "bg-muted border-2 border-muted-foreground/20 hover:border-accent/50 hover:scale-105 cursor-pointer"
                    }`}
                  >
                    <Fingerprint
                      className={`w-8 h-8 ${
                        mfaState === "no_match" ? "text-destructive" :
                        mfaState === "locked" ? "text-destructive" :
                        "text-muted-foreground"
                      }`}
                    />
                  </div>
                </button>
              )}

              {mfaState === "scanning" && (
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
                  <div className="z-10 w-20 h-20 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  </div>
                </div>
              )}

              {mfaState === "match" && (
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-500 animate-bounce" />
                  </div>
                </div>
              )}

              {error && mfaState !== "checking" && mfaState !== "no_match" && (
                <p className="text-sm text-destructive bg-destructive/10 py-2 rounded">
                  {error}
                </p>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("credentials")
                  setMfaState("checking")
                  setError("")
                  setPassword("")
                  setAttempts(0)
                  setLockoutUntil(0)
                }}
              >
                Back to sign in
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
