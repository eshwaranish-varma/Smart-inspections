import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db/client";
import { createSessionToken } from "@/lib/auth/auth-service";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { setSessionCookie } from "@/lib/auth/session";
import { jsonServerError } from "@/lib/server/json-error";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  fda_position: string | null;
  role: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
};

async function ensureProfilesTable() {
  await pool.query(`
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
}

async function getUserByEmail(email: string): Promise<ProfileRow | null> {
  const result = await pool.query<ProfileRow>(
    `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.fda_position,
        u.role,
        p.address_line,
        p.city,
        p.state,
        p.country,
        p.zip_code
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.email = $1
      LIMIT 1
    `,
    [email.toLowerCase()]
  );
  return result.rows[0] ?? null;
}

function buildProfilePayload(
  row: ProfileRow | null,
  tokenData: { firstName: string; lastName: string; email: string; fdaPosition?: string }
) {
  return {
    id: row?.id ?? "",
    first_name: row?.first_name ?? tokenData.firstName ?? "",
    last_name: row?.last_name ?? tokenData.lastName ?? "",
    email: row?.email ?? tokenData.email ?? "",
    phone: row?.phone ?? "",
    fda_position: row?.fda_position ?? tokenData.fdaPosition ?? "",
    role: row?.role ?? "investigator",
    address: row?.address_line ?? "",
    city: row?.city ?? "",
    state: row?.state ?? "",
    country: row?.country ?? "",
    zip_code: row?.zip_code ?? "",
  };
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getCurrentUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureProfilesTable();
    const user = await getUserByEmail(authUser.email);

    const profile = buildProfilePayload(user, {
      firstName: authUser.first_name,
      lastName: authUser.last_name,
      email: authUser.email,
      fdaPosition: authUser.fda_position ?? undefined,
    });
    // Always expose the authenticated user id (UUID). Email lookup can miss edge cases and would otherwise return id: "".
    return NextResponse.json({
      profile: { ...profile, id: user?.id ?? authUser.id },
    });
  } catch (error) {
    return jsonServerError("Failed to fetch profile", error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getCurrentUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const firstName = String(body.first_name ?? "").trim();
    const lastName = String(body.last_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const fdaPosition = String(body.fda_position ?? "").trim();
    const address = String(body.address ?? "").trim();
    const city = String(body.city ?? "").trim();
    const state = String(body.state ?? "").trim();
    const country = String(body.country ?? "").trim();
    const zipCode = String(body.zip_code ?? "").trim();

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required." },
        { status: 400 }
      );
    }

    await ensureProfilesTable();
    const currentUser = await getUserByEmail(authUser.email);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (email !== currentUser.email) {
      const existingEmailOwner = await getUserByEmail(email);
      if (existingEmailOwner && existingEmailOwner.id !== currentUser.id) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }
    }

    await pool.query(
      `
        UPDATE users
        SET first_name = $1, last_name = $2, email = $3, phone = $4, fda_position = $5, updated_at = NOW()
        WHERE id = $6
      `,
      [firstName, lastName, email, phone || null, fdaPosition || null, currentUser.id]
    );

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
      [currentUser.id, address || null, city || null, state || null, country || null, zipCode || null]
    );

    const updated = await getUserByEmail(email);
    const profilePayload = buildProfilePayload(updated, {
      firstName,
      lastName,
      email,
      fdaPosition: updated?.fda_position ?? fdaPosition,
    });
    const response = NextResponse.json({
      message: "Profile updated successfully.",
      profile: { ...profilePayload, id: updated?.id ?? currentUser.id },
    });

    const refreshedUser = {
      id: currentUser.id,
      first_name: firstName,
      last_name: lastName,
      email,
      fda_position: updated?.fda_position ?? fdaPosition,
      role: (currentUser.role as "supervisor" | "investigator") || "investigator",
    };
    setSessionCookie(response, createSessionToken(refreshedUser));

    return response;
  } catch (error) {
    return jsonServerError("Failed to update profile", error);
  }
}

