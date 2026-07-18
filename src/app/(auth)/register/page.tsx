"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Shield, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { registerStudent } from "./actions"

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
  const [success, setSuccess] = useState(false)
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
      setSuccess(true)
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const required =
    form.firstName && form.lastName && form.email && form.password &&
    form.confirmPassword && form.age && form.phone && form.state &&
    form.lga && form.address && form.matricNumber && form.department &&
    form.faculty && form.nin

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-2 border-accent/20">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Registration Successful!</CardTitle>
            <CardDescription className="text-base">
              Your account has been created.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              You can now log in using <span className="font-medium">{form.email}</span> and your password.
            </p>
            <Button className="w-full" onClick={() => router.push("/login")}>
              Go to Login
            </Button>
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
