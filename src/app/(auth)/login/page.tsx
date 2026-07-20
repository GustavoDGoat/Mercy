"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Fingerprint, Loader2, Shield, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { login, verifyMfa } from "./actions"

type MfaState = "idle" | "ready" | "scanning" | "match"

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<"credentials" | "mfa">("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [mfaState, setMfaState] = useState<MfaState>("idle")

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
      setMfaState("idle")
      setStep("mfa")
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  async function handleFingerprintScan() {
    if (!userId) return
    if (mfaState === "scanning" || mfaState === "match") return

    if (mfaState === "idle") {
      setMfaState("ready")
      return
    }

    if (mfaState === "ready") {
      setMfaState("scanning")
      await new Promise((r) => setTimeout(r, 1000))
      setMfaState("match")
      await new Promise((r) => setTimeout(r, 800))

      try {
        const mfaResult = await verifyMfa(userId)
        if (mfaResult.error) {
          setError(mfaResult.error)
          setMfaState("ready")
          return
        }
        router.push("/dashboard")
      } catch {
        setError("Authentication failed")
        setMfaState("ready")
      }
    }
  }

  function getMfaMessage(): string {
    switch (mfaState) {
      case "idle": return "Tap the fingerprint icon to begin verification"
      case "ready": return "Place your finger on the scanner"
      case "scanning": return "Reading fingerprint..."
      case "match": return "Fingerprint verified! Redirecting..."
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

              {(mfaState === "idle" || mfaState === "ready") && (
                <button
                  type="button"
                  onClick={handleFingerprintScan}
                  className="relative mx-auto w-24 h-24 flex items-center justify-center"
                >
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    mfaState === "ready"
                      ? "bg-accent/10 border-2 border-accent animate-pulse"
                      : "bg-muted border-2 border-muted-foreground/20 hover:border-accent/50 hover:scale-105 cursor-pointer"
                  }`}>
                    <Fingerprint className={`w-8 h-8 ${
                      mfaState === "ready" ? "text-accent" : "text-muted-foreground"
                    }`} />
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
                  setMfaState("idle")
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
