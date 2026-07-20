"use server"

import bcrypt from "bcryptjs"
import { querySingle, execute } from "@/lib/db"
import { encryptTemplate } from "@/lib/encryption"

export async function registerStudent(data: {
  email: string; password: string; firstName: string; lastName: string
  age: string; height?: string; weight?: string; phone: string
  religion?: string; state: string; lga: string; address: string
  matricNumber: string; department: string; faculty: string; nin: string
  level?: string
}) {
  const existingUser = await querySingle`SELECT id FROM users WHERE email = ${data.email}`
  if (existingUser) return { error: "A user with this email already exists" }

  const existingMatric = await querySingle`SELECT id FROM members WHERE matric_number = ${data.matricNumber}`
  if (existingMatric) return { error: "A member with this matric number already exists" }

  const existingNin = await querySingle`SELECT id FROM members WHERE nin = ${data.nin}`
  if (existingNin) return { error: "A member with this NIN already exists" }

  const userId = crypto.randomUUID()
  const memberId = `SE-${Date.now().toString(36).toUpperCase()}`
  const passwordHash = await bcrypt.hash(data.password, 12)
  const now = new Date().toISOString()

  await execute`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, member_id, created_at, updated_at)
    VALUES (${userId}, ${data.email}, ${passwordHash}, ${data.firstName}, ${data.lastName}, 'student', ${memberId}, ${now}, ${now})
  `

  await execute`
    INSERT INTO members (id, user_id, first_name, last_name, email, phone, matric_number, department, faculty, level, age, height, weight, religion, state, lga, address, nin, max_borrow_limit, status, registered_at, updated_at)
    VALUES (${memberId}, ${userId}, ${data.firstName}, ${data.lastName}, ${data.email}, ${data.phone}, ${data.matricNumber}, ${data.department}, ${data.faculty}, ${data.level || "100L"}, ${data.age}, ${data.height || null}, ${data.weight || null}, ${data.religion || null}, ${data.state}, ${data.lga}, ${data.address}, ${data.nin}, 4, 'active', ${now}, ${now})
  `

  return { success: true, userId, email: data.email }
}

export async function storeFingerprint(
  userId: string,
  template: string,
  platform: string,
  sdkVersion?: string,
  scannerModel?: string
) {
  const user = await querySingle<{ id: string }>`
    SELECT id FROM users WHERE id = ${userId}
  `
  if (!user) return { error: "User not found" }

  let encrypted: string
  try {
    encrypted = encryptTemplate(template)
  } catch (e: unknown) {
    return { error: `Template encryption failed: ${(e as Error).message}` }
  }

  await execute`
    UPDATE users
    SET fingerprint_template_encrypted = ${encrypted},
        fingerprint_platform = ${platform},
        fingerprint_sdk_version = ${sdkVersion || null},
        fingerprint_scanner_model = ${scannerModel || null},
        fingerprint_enrolled_at = NOW(),
        updated_at = NOW()
    WHERE id = ${userId}
  `

  return { success: true }
}
