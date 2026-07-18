import { Pool } from "pg"

let pool: Pool | null = null
let lastPoolInit = 0

function getConnString(): string {
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || ""
  return url.replace(/([?&])sslmode=[^&]*&?/g, "$1").replace(/[?&]$/, "")
}

function getPool(): Pool {
  const now = Date.now()

  if (pool && now - lastPoolInit < 60000) {
    return pool
  }

  if (pool) {
    pool.end().catch(() => {})
  }

  const connString = getConnString()

  pool = new Pool({
    connectionString: connString,
    max: 2,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
    keepAlive: false,
    ssl: { rejectUnauthorized: false },
  })

  pool.on("error", (err) => {
    console.error("[DB] Pool error:", err.message)
  })

  lastPoolInit = now
  return pool
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      if (i === retries) throw e
      if (err.code === "ECONNREFUSED" || err.code === "57P01" || err.code === "08006") {
        console.warn(`[DB] Retry ${i + 1}/${retries} after:`, err.message)
        getPool()
        await new Promise((r) => setTimeout(r, 500 * (i + 1)))
        continue
      }
      throw e
    }
  }
  throw new Error("Unreachable")
}

async function run<T>(query: string, params: unknown[]): Promise<T[]> {
  return withRetry(async () => {
    const client = await getPool().connect()
    try {
      const result = await client.query(query, params)
      return result.rows as T[]
    } finally {
      client.release()
    }
  })
}

export async function sql<T = Record<string, unknown>>(
  queryOrStrings: string | TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  let query: string
  let params: unknown[]

  if (typeof queryOrStrings === "string") {
    query = queryOrStrings
    params = values
  } else {
    let idx = 0
    query = queryOrStrings.reduce((acc, s, i) => {
      const val = values[idx++]
      return acc + s + (val !== undefined ? `$${i + 1}` : "")
    }, "")
    params = values.filter((v) => v !== undefined)
  }

  return run<T>(query, params)
}

export async function querySingle<T = Record<string, unknown>>(
  queryOrStrings: string | TemplateStringsArray,
  ...values: unknown[]
): Promise<T | null> {
  const rows = await sql<T>(queryOrStrings, ...values)
  return rows[0] || null
}

export async function execute(
  queryOrStrings: string | TemplateStringsArray,
  ...values: unknown[]
): Promise<void> {
  await sql(queryOrStrings, ...values)
}
