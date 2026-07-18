import { Pool } from "pg"

let pool: Pool | null = null

function getPool(): Pool {
  if (pool) return pool
  const connString = (process.env.POSTGRES_URL || "").replace(
    /([?&])sslmode=[^&]*/g,
    "$1sslmode=no-verify"
  )
  pool = new Pool({
    connectionString: connString,
    max: 5,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
  })
  return pool
}

export async function sql<T = Record<string, unknown>>(
  queryOrStrings: string | TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const client = await getPool().connect()
  try {
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

    const result = await client.query(query, params)
    return result.rows as T[]
  } finally {
    client.release()
  }
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
