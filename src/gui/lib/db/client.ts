import dns from "node:dns";
import { Pool, type PoolConfig } from "pg";

/** Prefer IPv4 when both A and AAAA exist — avoids some Windows/Supabase dual-stack timeouts. */
dns.setDefaultResultOrder("ipv4first");

/**
 * TLS for managed Postgres (Supabase, etc.). Node may throw SELF_SIGNED_CERT_IN_CHAIN
 * when a proxy/antivirus re-signs TLS or when sslmode from the URI is applied without
 * merging our ssl object — so we set rejectUnauthorized explicitly unless strict mode is on.
 */
function sslForConnectionString(rawUrl: string): PoolConfig["ssl"] {
  const url = rawUrl.toLowerCase();
  const needsSsl =
    url.includes("sslmode=require") ||
    url.includes("sslmode=verify-full") ||
    url.includes("supabase.co") ||
    url.includes("supabase.com") ||
    process.env.DB_SSL === "true";
  if (!needsSsl) return false;
  if (process.env.DB_SSL_REJECT_UNAUTHORIZED === "true") {
    return { rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
}

function sslForPool(): PoolConfig["ssl"] {
  return sslForConnectionString(process.env.DATABASE_URL || "");
}

function hasCompleteSplitConfig(): boolean {
  return Boolean(
    process.env.DB_HOST &&
      process.env.DB_NAME &&
      process.env.DB_USER !== undefined &&
      process.env.DB_PASSWORD !== undefined
  );
}

function isLocalDbHost(): boolean {
  const h = (process.env.DB_HOST || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1";
}

/**
 * When `DATABASE_URL` points at a remote host (Supabase, RDS, etc.), always use it.
 * Otherwise `DB_HOST=localhost` split config would override the URI and you'd connect
 * to local Postgres while still enabling SSL from the remote URL — causing
 * "The server does not support SSL connections".
 */
function shouldUseDatabaseUrlOnly(): boolean {
  const url = (process.env.DATABASE_URL || "").trim().toLowerCase();
  if (!url) return false;
  if (url.includes("@db:")) return false;
  if (url.includes("@localhost") || url.includes("@127.0.0.1")) return false;
  return true;
}

/** Avoid pg applying TLS from `sslmode` in the URI while we pass a separate `ssl` object (can cause SELF_SIGNED_CERT_IN_CHAIN). */
function connectionStringWithoutSslMode(connectionString: string): string {
  let s = connectionString.trim();
  s = s.replace(/[?&]sslmode=[^&]*/gi, "");
  s = s.replace(/\?&/, "?");
  s = s.replace(/\?$/, "");
  return s;
}

function buildPoolConfig(): PoolConfig {
  const ssl = sslForPool();
  const base = {
    ssl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  if (shouldUseDatabaseUrlOnly()) {
    const raw = process.env.DATABASE_URL!.trim();
    const connectionString = connectionStringWithoutSslMode(raw);
    return { ...base, connectionString };
  }

  // Root `.env` often has Docker `DATABASE_URL` (`@db:`) while `src/gui/.env` sets
  // `DB_HOST=localhost` for `npm run dev`. Prefer split config when targeting local Postgres.
  if (hasCompleteSplitConfig() && isLocalDbHost()) {
    return {
      ...base,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
  }

  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    return { ...base, connectionString };
  }

  if (hasCompleteSplitConfig()) {
    return {
      ...base,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
  }

  return { ...base, connectionString: "" };
}

const pool = new Pool(buildPoolConfig());

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

/** Supabase transaction pooler — DDL / long sessions are unreliable here. */
function isSupabaseTransactionPoolerUrl(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes("pooler.supabase.com") && u.includes(":6543");
}

/**
 * Connection string for one-off schema migrations (DDL). Prefer direct DB or session pooler.
 * - `DATABASE_DIRECT_URL`: Supabase "Direct connection" (db.*.supabase.co:5432) — best for DDL.
 * - Else if `DATABASE_URL` uses transaction pooler (:6543), rewrite to port 5432 (session mode on same host).
 * - Else use `DATABASE_URL` as-is.
 */
function migrationConnectionString(): string | null {
  const direct = process.env.DATABASE_DIRECT_URL?.trim();
  if (direct) return connectionStringWithoutSslMode(direct);
  const main = process.env.DATABASE_URL?.trim();
  if (!main) return null;
  let s = connectionStringWithoutSslMode(main);
  if (isSupabaseTransactionPoolerUrl(s)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[db] DATABASE_URL uses Supabase transaction pooler (:6543). Using session port :5432 for schema DDL. If migrations still fail, set DATABASE_DIRECT_URL to the direct db.*.supabase.co connection string from the Supabase dashboard."
      );
    }
    s = s.replace(/:6543\//, ":5432/");
  }
  return s;
}

let migrationPool: Pool | undefined;

/**
 * Pool used only by `ensureAuthTables` DDL. Avoids Supabase transaction pooler (6543), which
 * often terminates connections during `connect()` or migrations.
 */
export function getMigrationPool(): Pool {
  if (migrationPool) return migrationPool;
  const cs = migrationConnectionString();
  if (!cs) {
    migrationPool = pool;
    return migrationPool;
  }
  const ssl = sslForConnectionString(cs);
  migrationPool = new Pool({
    connectionString: cs,
    ssl,
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  });
  migrationPool.on("error", (err) => {
    console.error("Unexpected error on migration PostgreSQL pool", err);
  });
  return migrationPool;
}

export default pool;

