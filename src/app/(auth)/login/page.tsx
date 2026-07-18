"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Fingerprint, Loader2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { login, verifyMfa } from "./actions"

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<"credentials" | "mfa">("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [scanState, setScanState] = useState<"idle" | "scanning" | "success" | "error">("idle")
  const [userId, setUserId] = useState<string | null>(null)

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
      setStep("mfa")
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  async function handleFingerprintScan() {
    if (!userId || scanState !== "idle") return
    setScanState("scanning")

    await new Promise((r) => setTimeout(r, 1800))
    setScanState("success")

    await new Promise((r) => setTimeout(r, 600))
    try {
      const result = await verifyMfa(userId)
      if (result.error) {
        setError(result.error)
        setScanState("error")
        return
      }
      router.push("/dashboard")
    } catch {
      setError("Authentication failed")
      setScanState("error")
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
                  Place your finger on the scanner to verify your identity
                </p>
              </div>

              <button
                type="button"
                onClick={handleFingerprintScan}
                disabled={scanState !== "idle"}
                className="relative mx-auto w-24 h-24 flex items-center justify-center"
              >
                <div
                  className={`absolute inset-0 rounded-full ${
                    scanState === "scanning"
                      ? "bg-accent/20 animate-ping"
                      : scanState === "success"
                      ? "bg-green-500/20"
                      : scanState === "error"
                      ? "bg-destructive/20"
                      : ""
                  }`}
                />
                <div
                  className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                    scanState === "scanning"
                      ? "bg-accent/20 border-2 border-accent scale-110"
                      : scanState === "success"
                      ? "bg-green-500/20 border-2 border-green-500"
                      : scanState === "error"
                      ? "bg-destructive/20 border-2 border-destructive"
                      : "bg-muted border-2 border-muted-foreground/20 hover:border-accent/50"
                  }`}
                >
                  {scanState === "scanning" ? (
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  ) : scanState === "success" ? (
                    <Fingerprint className="w-8 h-8 text-green-500 animate-bounce" />
                  ) : (
                    <Fingerprint className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
              </button>

              <p className="text-xs text-muted-foreground">
                {scanState === "idle" && "Tap the fingerprint icon to scan"}
                {scanState === "scanning" && "Scanning fingerprint..."}
                {scanState === "success" && "Fingerprint verified! Redirecting..."}
                {scanState === "error" && "Verification failed. Please try again."}
              </p>

              {error && (
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
                  setScanState("idle")
                  setError("")
                  setPassword("")
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
