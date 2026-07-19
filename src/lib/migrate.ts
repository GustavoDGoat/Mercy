import { sql, execute, querySingle } from "./db"

let migrated = false

export async function migrate(): Promise<void> {
  if (migrated) return

  try {
    await execute`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL, last_name TEXT NOT NULL, role TEXT NOT NULL,
        member_id TEXT, fingerprint_hash TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await execute`ALTER TABLE users ADD COLUMN IF NOT EXISTS fingerprint_template TEXT`
    await execute`ALTER TABLE users ADD COLUMN IF NOT EXISTS fingerprint_platform TEXT`
    await execute`
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY, user_id TEXT, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
        email TEXT NOT NULL, phone TEXT, matric_number TEXT UNIQUE NOT NULL,
        department TEXT, faculty TEXT, level TEXT, max_borrow_limit INTEGER DEFAULT 4,
        status TEXT DEFAULT 'active', registered_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await execute`ALTER TABLE members ADD COLUMN IF NOT EXISTS age TEXT`
    await execute`ALTER TABLE members ADD COLUMN IF NOT EXISTS height TEXT`
    await execute`ALTER TABLE members ADD COLUMN IF NOT EXISTS weight TEXT`
    await execute`ALTER TABLE members ADD COLUMN IF NOT EXISTS religion TEXT`
    await execute`ALTER TABLE members ADD COLUMN IF NOT EXISTS state TEXT`
    await execute`ALTER TABLE members ADD COLUMN IF NOT EXISTS lga TEXT`
    await execute`ALTER TABLE members ADD COLUMN IF NOT EXISTS address TEXT`
    await execute`ALTER TABLE members ADD COLUMN IF NOT EXISTS nin TEXT UNIQUE`
    await execute`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY, isbn TEXT NOT NULL, title TEXT NOT NULL, author TEXT NOT NULL,
        publisher TEXT, year_published INTEGER, edition TEXT, category TEXT, shelf_location TEXT,
        total_copies INTEGER DEFAULT 1, available_copies INTEGER DEFAULT 1, rfid_tag_id TEXT UNIQUE,
        pdf_url TEXT, cover_image TEXT, description TEXT, status TEXT DEFAULT 'available',
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await execute`CREATE TABLE IF NOT EXISTS rfid_tags (id TEXT PRIMARY KEY, tag_id TEXT UNIQUE NOT NULL, book_id TEXT, is_active BOOLEAN DEFAULT true, last_scanned_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW())`
    await execute`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, book_id TEXT, member_id TEXT, issued_by TEXT, issue_date TIMESTAMPTZ NOT NULL, due_date TIMESTAMPTZ NOT NULL, return_date TIMESTAMPTZ, fine_amount NUMERIC DEFAULT 0, fine_paid BOOLEAN DEFAULT false, status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`
    await execute`CREATE TABLE IF NOT EXISTS borrow_requests (id TEXT PRIMARY KEY, book_id TEXT, member_id TEXT, requested_by TEXT, duration_days INTEGER NOT NULL, format TEXT NOT NULL, status TEXT DEFAULT 'pending', approved_by TEXT, approved_duration INTEGER, rejection_reason TEXT, transaction_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`
    await execute`CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT, related_id TEXT, read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW())`
    await execute`CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, details TEXT, ip_address TEXT, timestamp TIMESTAMPTZ DEFAULT NOW(), hash TEXT NOT NULL, previous_hash TEXT NOT NULL)`
    await execute`CREATE TABLE IF NOT EXISTS rfid_gate_events (id TEXT PRIMARY KEY, book_id TEXT, book_title TEXT, tag_id TEXT, member_id TEXT, authorized BOOLEAN, triggered_at TIMESTAMPTZ DEFAULT NOW())`

    migrated = true
  } catch (e) {
    console.error("[Migrate] Failed:", (e as Error).message)
    throw e
  }
}
