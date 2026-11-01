import pg from "pg";
import "dotenv/config";

// Return COUNT(*) as numbers, and DATE columns as "YYYY-MM-DD" strings (not Date objects).
pg.types.setTypeParser(20, Number);
pg.types.setTypeParser(1082, (v) => v);

const rawPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase requires TLS; a local Postgres usually has none.
  ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || "") ? false : { rejectUnauthorized: false },
  max: 10,
});

// Write `?` placeholders in SQL; Postgres wants $1, $2, ...
const numbered = (sql) => {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
};

/**
 * Returns `[rows]` for a SELECT, and
 * `[{ insertId, affectedRows, rows }]` for writes (add `RETURNING id` to get insertId).
 */
async function run(client, sql, params = []) {
  const res = await client.query(numbered(sql), params);
  const r = Array.isArray(res) ? res.at(-1) : res; // several statements in one call (schema.sql)
  if (r.command === "SELECT") return [r.rows];
  return [{ insertId: r.rows[0]?.id, affectedRows: r.rowCount, rows: r.rows }];
}

export const pool = {
  query: (sql, params) => run(rawPool, sql, params),
  async getConnection() {
    const client = await rawPool.connect();
    return {
      query: (sql, params) => run(client, sql, params),
      beginTransaction: () => client.query("BEGIN"),
      commit: () => client.query("COMMIT"),
      rollback: () => client.query("ROLLBACK"),
      release: () => client.release(),
    };
  },
  end: () => rawPool.end(),
};

/** True when an error is a unique-constraint violation (optionally on a named constraint/index). */
export const isUniqueViolation = (err, name) =>
  err?.code === "23505" && (!name || err.constraint === name);
