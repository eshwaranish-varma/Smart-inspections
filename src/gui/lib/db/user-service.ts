import type { PoolClient } from "pg";
import pool, { getMigrationPool } from "@/lib/db/client";

/** After first successful run, skip re-running DDL on every request. */
let authSchemaReady = false;
let schemaInitPromise: Promise<void> | null = null;

export type UserRole = "supervisor" | "investigator";

export type UserRecord = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  fda_position: string | null;
  role: UserRole;
  password_hash: string;
  is_verified: boolean;
  verification_code: string | null;
  verification_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type UserSignatureProfile = {
  signature_type: string | null;
  signature_text: string | null;
  signature_image: string | null;
  signed_name: string | null;
  signature_updated_at: Date | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Node / pg pool errors when the DB host cannot be reached (DNS, firewall, paused Supabase, etc.) */
const DB_HOST_UNREACHABLE_CODES = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ECONNRESET",
]);

export function isDatabaseUnavailableError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const code = (e as NodeJS.ErrnoException).code;
  return code === "DATABASE_UNAVAILABLE";
}

function throwDatabaseUnavailable(original: unknown): never {
  const err = original as NodeJS.ErrnoException;
  const sys = err?.code && typeof err.code === "string" ? err.code : "UNKNOWN";
  const wrapped = new Error(
    `Database unreachable (${sys}). Check DATABASE_URL, firewall (outbound port 5432), VPN, and Supabase dashboard connection string. If connect times out to Cloudflare-like IPs, verify the host is the Database URI from Supabase (db.*.supabase.co or pooler), not the HTTPS project URL.`
  );
  (wrapped as NodeJS.ErrnoException).code = "DATABASE_UNAVAILABLE";
  throw wrapped;
}

function isUnreachableConnectionError(e: unknown): boolean {
  const err = e as NodeJS.ErrnoException & { errors?: unknown[] };
  if (err?.code && DB_HOST_UNREACHABLE_CODES.has(err.code)) return true;
  if (e && typeof e === "object" && (e as Error).name === "AggregateError" && Array.isArray(err.errors)) {
    return err.errors.some(
      (inner) =>
        typeof inner === "object" &&
        inner !== null &&
        DB_HOST_UNREACHABLE_CODES.has((inner as NodeJS.ErrnoException).code as string)
    );
  }
  return false;
}

export async function ensureAuthTables() {
  if (authSchemaReady) return;
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      let client: PoolClient | undefined;
      try {
        // pool.connect() throws here too — must catch (same as DDL errors)
        client = await getMigrationPool().connect();
        // One transaction on one connection: transaction poolers otherwise return the client
        // between statements and DDL can hit "connection terminated" / timeouts.
        await client.query("BEGIN");
        await client.query("SET LOCAL statement_timeout = '120s'");
        await runAuthSchemaMigrations(client);
        await client.query("COMMIT");
        authSchemaReady = true;
      } catch (e) {
        try {
          if (client) await client.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        if (isUnreachableConnectionError(e)) {
          throwDatabaseUnavailable(e);
        }
        throw e;
      } finally {
        if (client) client.release();
        schemaInitPromise = null;
      }
    })();
  }
  await schemaInitPromise;
}

async function runAuthSchemaMigrations(client: PoolClient): Promise<void> {
  // Use gen_random_uuid() (Postgres 13+) — no uuid-ossp extension. Supabase poolers often reject CREATE EXTENSION / DDL.
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(50),
      fda_position VARCHAR(255),
      role VARCHAR(20) NOT NULL DEFAULT 'investigator',
      password_hash TEXT NOT NULL,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      verification_code VARCHAR(50),
      verification_expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      code VARCHAR(10) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      code VARCHAR(10) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      address_line VARCHAR(255),
      city VARCHAR(120),
      state VARCHAR(120),
      country VARCHAR(120),
      zip_code VARCHAR(20),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS signature_type VARCHAR(20);`);
  await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS signature_text TEXT;`);
  await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS signature_image TEXT;`);
  await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS signed_name VARCHAR(255);`);
  await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS signature_updated_at TIMESTAMP;`);
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'investigator';`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS inspections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      firm_name VARCHAR(255) NOT NULL DEFAULT '',
      fei_number VARCHAR(20) NOT NULL DEFAULT '',
      establishment_type VARCHAR(100) DEFAULT '',
      street_address VARCHAR(255) DEFAULT '',
      city VARCHAR(120) DEFAULT '',
      state VARCHAR(120) DEFAULT '',
      zip_code VARCHAR(20) DEFAULT '',
      country VARCHAR(120) DEFAULT 'United States',
      district_office VARCHAR(255) DEFAULT '',
      inspection_start DATE,
      inspection_end DATE,
      regulatory_basis TEXT DEFAULT '',
      status VARCHAR(30) NOT NULL DEFAULT 'created',
      created_by UUID NOT NULL REFERENCES users(id),
      assigned_to UUID REFERENCES users(id),
      observations_json TEXT DEFAULT '[]',
      eir_json TEXT DEFAULT '{}',
      metadata_json TEXT DEFAULT '{}',
      raw_notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS inspection_workflow_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
      action VARCHAR(50) NOT NULL,
      performed_by UUID NOT NULL REFERENCES users(id),
      comments TEXT DEFAULT '',
      previous_status VARCHAR(30),
      new_status VARCHAR(30),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS inspection_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
      reviewer_id UUID NOT NULL REFERENCES users(id),
      decision VARCHAR(20) NOT NULL,
      comments TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS inspection_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
      author_id UUID NOT NULL REFERENCES users(id),
      author_role VARCHAR(20) NOT NULL,
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS inspection_document_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      created_by UUID NOT NULL REFERENCES users(id),
      file_docx_path TEXT DEFAULT '',
      file_pdf_path TEXT DEFAULT '',
      version_type VARCHAR(20) NOT NULL,
      comments_snapshot TEXT DEFAULT '',
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS document_library_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      final_docx_path TEXT DEFAULT '',
      final_pdf_path TEXT DEFAULT '',
      status VARCHAR(50) NOT NULL DEFAULT 'ready_to_publish',
      approved_at TIMESTAMP DEFAULT NOW(),
      investigator_id UUID REFERENCES users(id),
      supervisor_id UUID REFERENCES users(id),
      publish_ready BOOLEAN NOT NULL DEFAULT TRUE,
      archived_year INTEGER,
      reopened_from_document_id UUID REFERENCES document_library_records(id),
      final_metadata_json TEXT NOT NULL DEFAULT '{}',
      final_observations_json TEXT NOT NULL DEFAULT '[]',
      final_eir_json TEXT NOT NULL DEFAULT '{}',
      signatures_json TEXT NOT NULL DEFAULT '{}',
      comments_snapshot_json TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      run_type VARCHAR(80) NOT NULL,
      model VARCHAR(120),
      doc_id VARCHAR(120),
      input_summary JSONB DEFAULT '{}',
      output_summary JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(120) NOT NULL,
      entity_type VARCHAR(80),
      changes JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS document_review_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_kind VARCHAR(20) NOT NULL DEFAULT '483',
      body TEXT NOT NULL,
      page_number INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS document_review_signatures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
      signer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      signer_name VARCHAR(255) NOT NULL,
      decision VARCHAR(20) NOT NULL,
      signed_at TIMESTAMP DEFAULT NOW(),
      signature_note TEXT
    );
  `);

  await client.query(`ALTER TABLE inspections ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;`);
  await client.query(
    `ALTER TABLE inspections ADD COLUMN IF NOT EXISTS workflow_archived BOOLEAN NOT NULL DEFAULT FALSE;`
  );

  /** Demo accounts: keep canonical supervisor role (login page lists these emails). */
  await client.query(
    `UPDATE users SET role = 'supervisor', updated_at = NOW()
     WHERE LOWER(TRIM(email)) IN ('james.mitchell@fda.hhs.gov', 'sandra.chen@fda.hhs.gov')`
  );
}

export async function getInvestigators(): Promise<Pick<UserRecord, "id" | "first_name" | "last_name" | "email" | "fda_position">[]> {
  await ensureAuthTables();
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, fda_position FROM users WHERE role = 'investigator' AND is_verified = TRUE ORDER BY last_name`
  );
  return result.rows;
}

export async function getAllUsers(): Promise<Pick<UserRecord, "id" | "first_name" | "last_name" | "email" | "role" | "fda_position">[]> {
  await ensureAuthTables();
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, role, fda_position FROM users WHERE is_verified = TRUE ORDER BY last_name`
  );
  return result.rows;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  await ensureAuthTables();
  const result = await pool.query<UserRecord>(
    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    [normalizeEmail(email)]
  );
  return result.rows[0] ?? null;
}

export async function getUserById(userId: string): Promise<UserRecord | null> {
  await ensureAuthTables();
  const result = await pool.query<UserRecord>(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function createUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  fdaPosition?: string | null;
  role?: "supervisor" | "investigator";
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  passwordHash: string;
  verificationCode: string;
  verificationExpiresAt: Date;
}): Promise<UserRecord> {
  await ensureAuthTables();

  const result = await pool.query<UserRecord>(
    `
      INSERT INTO users (
        first_name,
        last_name,
        email,
        phone,
        fda_position,
        role,
        password_hash,
        is_verified,
        verification_code,
        verification_expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8, NOW() + INTERVAL '10 minutes')
      RETURNING *
    `,
    [
      input.firstName,
      input.lastName,
      normalizeEmail(input.email),
      input.phone || null,
      input.fdaPosition || null,
      input.role || "investigator",
      input.passwordHash,
      input.verificationCode,
    ]
  );

  const user = result.rows[0];
  await pool.query(
    `
      INSERT INTO user_profiles (user_id, address_line, city, state, country, zip_code, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        address_line = EXCLUDED.address_line,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        country = EXCLUDED.country,
        zip_code = EXCLUDED.zip_code,
        updated_at = NOW()
    `,
    [
      user.id,
      input.address || null,
      input.city || null,
      input.state || null,
      input.country || null,
      input.zipCode || null,
    ]
  );
  await storeOtpCode(user.id, input.verificationCode, input.verificationExpiresAt);
  return user;
}

export async function storeOtpCode(
  userId: string,
  code: string,
  _expiresAt?: Date
): Promise<void> {
  await ensureAuthTables();
  await pool.query(
    `
      UPDATE users
      SET verification_code = $2,
          verification_expires_at = NOW() + INTERVAL '10 minutes',
          updated_at = NOW()
      WHERE id = $1
    `,
    [userId, code]
  );

  await pool.query(
    `INSERT INTO email_verifications (user_id, code, expires_at, used) VALUES ($1, $2, NOW() + INTERVAL '10 minutes', FALSE)`,
    [userId, code]
  );
}

export async function markEmailVerified(userId: string, code: string): Promise<void> {
  await ensureAuthTables();
  await pool.query(
    `
      UPDATE users
      SET is_verified = TRUE,
          verification_code = NULL,
          verification_expires_at = NULL,
          updated_at = NOW()
      WHERE id = $1
    `,
    [userId]
  );

  await pool.query(
    `UPDATE email_verifications SET used = TRUE WHERE user_id = $1 AND code = $2`,
    [userId, code]
  );
}

export async function findValidOtp(userId: string, code: string): Promise<UserRecord | null> {
  await ensureAuthTables();
  const result = await pool.query<UserRecord>(
    `
      SELECT *
      FROM users
      WHERE id = $1
        AND verification_code = $2
        AND verification_expires_at IS NOT NULL
        AND verification_expires_at > NOW()
      LIMIT 1
    `,
    [userId, code]
  );
  return result.rows[0] ?? null;
}

export async function storePasswordResetCode(
  userId: string,
  code: string,
  expiresAt: Date
): Promise<void> {
  await ensureAuthTables();
  await pool.query(
    `
      INSERT INTO password_reset_codes (user_id, code, expires_at, used)
      VALUES ($1, $2, $3, FALSE)
    `,
    [userId, code, expiresAt]
  );
}

export async function findValidPasswordResetCode(email: string, code: string): Promise<UserRecord | null> {
  await ensureAuthTables();
  const normalizedEmail = normalizeEmail(email);
  const trimmedCode = code.trim();

  const result = await pool.query<UserRecord>(
    `
      SELECT u.*
      FROM password_reset_codes prc
      JOIN users u ON u.id = prc.user_id
      WHERE u.email = $1
        AND prc.code = $2
        AND prc.used = FALSE
        AND prc.expires_at > NOW()
      ORDER BY prc.created_at DESC
      LIMIT 1
    `,
    [normalizedEmail, trimmedCode]
  );

  return result.rows[0] ?? null;
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string,
  code: string
): Promise<void> {
  await ensureAuthTables();
  const trimmedCode = code.trim();

  await pool.query(
    `
      UPDATE users
      SET password_hash = $2,
          is_verified = TRUE,
          verification_code = NULL,
          verification_expires_at = NULL,
          updated_at = NOW()
      WHERE id = $1
    `,
    [userId, passwordHash]
  );

  await pool.query(
    `UPDATE password_reset_codes SET used = TRUE WHERE user_id = $1 AND code = $2`,
    [userId, trimmedCode]
  );
}
