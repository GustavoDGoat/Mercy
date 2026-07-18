const AES_KEY = "LAUTECH-SLMS-AES-256-SIMULATED-KEY"
const IV = "SLMS-INIT-VECTOR16"

function toHex(str: string): string {
  return str
    .split("")
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
}

function fromHex(hex: string): string {
  const chars: string[] = []
  for (let i = 0; i < hex.length; i += 2) {
    chars.push(String.fromCharCode(parseInt(hex.substring(i, i + 2), 16)))
  }
  return chars.join("")
}

function xorStrings(a: string, b: string): string {
  const len = Math.max(a.length, b.length)
  let result = ""
  for (let i = 0; i < len; i++) {
    const charCode =
      (a.charCodeAt(i % a.length) || 0) ^ (b.charCodeAt(i % b.length) || 0)
    result += String.fromCharCode(charCode)
  }
  return result
}

export function encryptField(plaintext: string): string {
  const step1 = toHex(`${IV}:${plaintext}`)
  const step2 = xorStrings(step1, AES_KEY)
  const step3 = toHex(step2)
  return `AES256::${step3}`
}

export function decryptField(ciphertext: string): string {
  if (!ciphertext.startsWith("AES256::")) {
    throw new Error("Invalid encryption format")
  }
  const step3 = ciphertext.replace("AES256::", "")
  const step2 = fromHex(step3)
  const step1 = xorStrings(step2, AES_KEY)
  const decoded = fromHex(step1)
  const parts = decoded.split(":")
  if (parts.length < 2 || parts[0] !== IV) {
    throw new Error("Decryption failed: integrity check failed")
  }
  return parts.slice(1).join(":")
}

export function generateRFIDTagId(): string {
  const prefix = "RFID"
  const random = Array.from({ length: 10 }, () =>
    Math.floor(Math.random() * 10)
  ).join("")
  const checksum = Array.from(random)
    .reduce((sum, d) => sum + parseInt(d), 0)
    .toString()
    .slice(-2)
    .padStart(2, "0")
  return `${prefix}-${random}${checksum}`
}

export function validateRFIDTagId(tagId: string): boolean {
  if (!/^RFID-\d{12}$/.test(tagId)) return false
  const digits = tagId.replace("RFID-", "").slice(0, 10)
  const checksum = tagId.slice(-2)
  const calcChecksum = digits
    .split("")
    .reduce((sum, d) => sum + parseInt(d), 0)
    .toString()
    .slice(-2)
    .padStart(2, "0")
  return checksum === calcChecksum
}
