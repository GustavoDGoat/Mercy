"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Shield, CheckCircle, Fingerprint, WifiOff, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { registerStudent, storeFingerprint } from "./actions"
import { checkScannerStatus, enrollFingerprint, type ScannerStatus } from "@/lib/fingerprint"

type EnrollState = "checking" | "no_scanner" | "ready" | "scanning" | "success" | "error"

interface FormData {
  firstName: string; lastName: string; email: string; password: string
  confirmPassword: string; age: string; height: string; weight: string
  phone: string; religion: string; state: string; lga: string
  address: string; matricNumber: string; department: string
  faculty: string; nin: string; level: string
}

const empty: FormData = {
  firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
  age: "", height: "", weight: "", phone: "", religion: "", state: "",
  lga: "", address: "", matricNumber: "", department: "", faculty: "",
  nin: "", level: "100L",
}

const states = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
]

const levels = ["100L", "200L", "300L", "400L", "500L", "PGD", "M.Sc", "Ph.D"]

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"form" | "enroll" | "done">("form")
  const [userId, setUserId] = useState<string | null>(null)
  const [enrollState, setEnrollState] = useState<EnrollState>("checking")
  const [enrollError, setEnrollError] = useState("")
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>({ connected: false })
  const [showPassword, setShowPassword] = useState(false)

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    try {
      const result = await registerStudent({
        email: form.email, password: form.password,
        firstName: form.firstName, lastName: form.lastName,
        age: form.age, height: form.height || undefined,
        weight: form.weight || undefined, phone: form.phone,
        religion: form.religion || undefined, state: form.state,
        lga: form.lga, address: form.address,
        matricNumber: form.matricNumber, department: form.department,
        faculty: form.faculty, nin: form.nin, level: form.level,
      })
      if (result && "error" in result) {
        setError(result.error as string)
        return
      }
      setUserId(result.userId!)
      setStep("enroll")
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (step !== "enroll") return
    let cancelled = false

    async function init() {
      setEnrollState("checking")
      const status = await checkScannerStatus()
      if (cancelled) return
      setScannerStatus(status)
      if (!status.connected) {
        setEnrollState("no_scanner")
        return
      }
      setEnrollState("ready")
    }

    init()
    return () => { cancelled = true }
  }, [step])

  async function handleEnroll() {
    if (enrollState !== "ready") return
    setEnrollState("scanning")
    setEnrollError("")

    try {
      const result = await enrollFingerprint()
      if (!result.template) {
        setEnrollError("Enrollment failed: no template received")
        setEnrollState("ready")
        return
      }

      const stored = await storeFingerprint(userId!, result.template, result.platform)
      if (stored && "error" in stored) {
        setEnrollError(stored.error as string)
        setEnrollState("ready")
        return
      }

      setEnrollState("success")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Enrollment failed"
      setEnrollError(msg)
      setEnrollState("ready")
    }
  }

  async function handleRetryScanner() {
    setEnrollState("checking")
    setEnrollError("")
    const status = await checkScannerStatus()
    setScannerStatus(status)
    if (!status.connected) {
      setEnrollState("no_scanner")
      return
    }
    setEnrollState("ready")
  }

  const required =
    form.firstName && form.lastName && form.email && form.password &&
    form.confirmPassword && form.age && form.phone && form.state &&
    form.lga && form.address && form.matricNumber && form.department &&
    form.faculty && form.nin

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-2 border-accent/20">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Registration Complete!</CardTitle>
            <CardDescription className="text-base">
              Your account and fingerprint have been set up.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              You can now log in using <span className="font-medium">{form.email}</span> and your password, then scan your fingerprint.
            </p>
            <Button className="w-full" onClick={() => router.push("/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "enroll") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-2 border-accent/20">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
              <Fingerprint className="w-8 h-8 text-accent" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Fingerprint Enrollment</CardTitle>
            <CardDescription className="text-base">
              {enrollState === "checking" && "Connecting to fingerprint scanner..."}
              {enrollState === "no_scanner" && (scannerStatus.error || "Scanner not detected. Connect the USB scanner.")}
              {enrollState === "ready" && !enrollError && "Place your finger on the scanner to register your fingerprint"}
              {enrollState === "scanning" && "Scanning fingerprint. Keep your finger steady..."}
              {enrollState === "success" && "Fingerprint enrolled successfully!"}
              {enrollState === "error" && "Enrollment failed. Please try again."}
              {enrollState === "ready" && enrollError && enrollError}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {enrollState === "checking" && (
              <div className="mx-auto w-24 h-24 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-muted border-2 border-muted-foreground/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
              </div>
            )}

            {enrollState === "no_scanner" && (
              <div className="space-y-4">
                <div className="mx-auto w-24 h-24 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center">
                    <WifiOff className="w-8 h-8 text-destructive" />
                  </div>
                </div>
                <Button onClick={handleRetryScanner} size="sm" variant="outline">
                  Retry
                </Button>
              </div>
            )}

            {(enrollState === "ready" || enrollState === "error") && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleEnroll}
                  className="relative mx-auto w-24 h-24 flex items-center justify-center"
                >
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    enrollState === "error"
                      ? "bg-destructive/10 border-2 border-destructive"
                      : "bg-muted border-2 border-muted-foreground/20 hover:border-accent/50 hover:scale-105 cursor-pointer"
                  }`}>
                    <Fingerprint className={`w-8 h-8 ${
                      enrollState === "error" ? "text-destructive" : "text-muted-foreground"
                    }`} />
                  </div>
                </button>
                <p className="text-xs text-muted-foreground">Tap the fingerprint icon to begin scanning</p>
              </div>
            )}

            {enrollState === "scanning" && (
              <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
                <div className="z-10 w-20 h-20 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
              </div>
            )}

            {enrollState === "success" && (
              <div className="mx-auto w-24 h-24 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500 animate-bounce" />
                </div>
              </div>
            )}

            <div>
              {enrollState === "success" ? (
                <Button className="w-full" onClick={() => setStep("done")}>
                  Continue
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setStep("done")}
                  size="sm"
                >
                  Skip fingerprint setup
                </Button>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">
                You can set up your fingerprint later through a librarian.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4 flex items-start justify-center">
      <Card className="w-full max-w-2xl shadow-2xl border-2 border-accent/20">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <Shield className="w-8 h-8 text-accent" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Student Registration</CardTitle>
          <CardDescription>LAUTECH Library Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <ScrollArea className="max-h-[65vh]">
              <div className="space-y-6 p-1">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-3">Personal Information</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input id="lastName" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="age">Age *</Label>
                      <Input id="age" type="number" min="15" max="100" value={form.age} onChange={(e) => update("age", e.target.value)} required disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="height">Height</Label>
                      <Input id="height" placeholder="e.g. 5ft 8in" value={form.height} onChange={(e) => update("height", e.target.value)} disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="weight">Weight</Label>
                      <Input id="weight" placeholder="e.g. 70kg" value={form.weight} onChange={(e) => update("weight", e.target.value)} disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="religion">Religion</Label>
                      <Input id="religion" value={form.religion} onChange={(e) => update("religion", e.target.value)} disabled={loading} />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-3">Contact &amp; Location</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input id="phone" type="tel" placeholder="08012345678" value={form.phone} onChange={(e) => update("phone", e.target.value)} required disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="state">State *</Label>
                      <Select value={form.state} onValueChange={(v) => update("state", v ?? "")} disabled={loading}>
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>
                          {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lga">LGA *</Label>
                      <Input id="lga" value={form.lga} onChange={(e) => update("lga", e.target.value)} required disabled={loading} />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label htmlFor="address">Address *</Label>
                      <Textarea id="address" value={form.address} onChange={(e) => update("address", e.target.value)} required disabled={loading} rows={2} />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-3">Academic Information</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="matricNumber">Matric Number *</Label>
                      <Input id="matricNumber" value={form.matricNumber} onChange={(e) => update("matricNumber", e.target.value)} required disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="level">Level</Label>
                      <Select value={form.level} onValueChange={(v) => update("level", v ?? "100L")} disabled={loading}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="nin">NIN *</Label>
                      <Input id="nin" placeholder="NIN Number" value={form.nin} onChange={(e) => update("nin", e.target.value)} required disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="department">Department *</Label>
                      <Input id="department" placeholder="e.g. Computer Science" value={form.department} onChange={(e) => update("department", e.target.value)} required disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="faculty">Faculty *</Label>
                      <Input id="faculty" placeholder="e.g. Engineering" value={form.faculty} onChange={(e) => update("faculty", e.target.value)} required disabled={loading} />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-3">Login Credentials</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative">
                        <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min. 6 characters" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} disabled={loading} className="pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <Input id="confirmPassword" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} required disabled={loading} />
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded">{error}</p>
                )}
              </div>
            </ScrollArea>

            <div className="mt-6 space-y-3">
              <Button type="submit" className="w-full" disabled={loading || !required}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating Account...</> : "Create Account"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Already registered?{" "}
                <a href="/login" className="text-primary hover:underline font-medium">Sign in</a>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
