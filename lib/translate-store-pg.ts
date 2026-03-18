/**
 * Postgres-backed store for users, settings, roles, learning.
 * Used when DATABASE_URL is set so preset roles and account data sync across devices.
 */

import { neon } from "@neondatabase/serverless";
import type {
  TranslateUser,
  GlobalSettings,
  TranslateRole,
  LearningExample
} from "./translate-types";
import { DEFAULT_GLOBAL_SETTINGS } from "./translate-types";

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;

export const isPgConfigured = !!sql;

async function ensureSchema() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS translate_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS translate_user_settings (
      user_id TEXT PRIMARY KEY REFERENCES translate_users(id) ON DELETE CASCADE,
      preferred_words JSONB NOT NULL DEFAULT '[]',
      preferred_emojis JSONB NOT NULL DEFAULT '[]'
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS translate_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES translate_users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      traits JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS translate_learning (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES translate_users(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL,
      original TEXT NOT NULL,
      translated TEXT NOT NULL,
      action TEXT NOT NULL,
      refined TEXT,
      at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_learning_user_role ON translate_learning(user_id, role_id)`;
  await sql`
    CREATE TABLE IF NOT EXISTS translate_user_usage (
      user_id TEXT NOT NULL REFERENCES translate_users(id) ON DELETE CASCADE,
      usage_date DATE NOT NULL,
      chars_used INT NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, usage_date)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS translate_user_limits (
      user_id TEXT PRIMARY KEY REFERENCES translate_users(id) ON DELETE CASCADE,
      max_per_message INT NOT NULL DEFAULT 200,
      max_per_day INT NOT NULL DEFAULT 2000
    )
  `;
}

let schemaDone = false;
async function maybeSchema() {
  if (!schemaDone && sql) {
    await ensureSchema();
    schemaDone = true;
  }
}

export async function pgFindUserByEmail(email: string): Promise<TranslateUser | null> {
  if (!sql) return null;
  await maybeSchema();
  const rows = await sql`
    SELECT id, email, password_hash, created_at::text
    FROM translate_users WHERE LOWER(TRIM(email)) = LOWER(TRIM(${email}))
  `;
  const r = rows[0] as { id: string; email: string; password_hash: string; created_at: string } | undefined;
  if (!r) return null;
  return { id: r.id, email: r.email, passwordHash: r.password_hash, createdAt: r.created_at };
}

export async function pgFindUserById(id: string): Promise<TranslateUser | null> {
  if (!sql) return null;
  await maybeSchema();
  const rows = await sql`
    SELECT id, email, password_hash, created_at::text
    FROM translate_users WHERE id = ${id}
  `;
  const r = rows[0] as { id: string; email: string; password_hash: string; created_at: string } | undefined;
  if (!r) return null;
  return { id: r.id, email: r.email, passwordHash: r.password_hash, createdAt: r.created_at };
}

export async function pgCreateUser(
  email: string,
  passwordHash: string
): Promise<TranslateUser> {
  if (!sql) throw new Error("DATABASE_URL not set");
  await maybeSchema();
  const normalized = email.trim().toLowerCase();
  const existing = await pgFindUserByEmail(normalized);
  if (existing) throw new Error("EMAIL_IN_USE");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await sql`
    INSERT INTO translate_users (id, email, password_hash, created_at)
    VALUES (${id}, ${normalized}, ${passwordHash}, ${now}::timestamptz)
  `;
  await sql`
    INSERT INTO translate_user_settings (user_id, preferred_words, preferred_emojis)
    VALUES (${id}, ${JSON.stringify(DEFAULT_GLOBAL_SETTINGS.preferredWords)}::jsonb, ${JSON.stringify(DEFAULT_GLOBAL_SETTINGS.preferredEmojis)}::jsonb)
  `;
  return { id, email: normalized, passwordHash, createdAt: now };
}

export async function pgGetGlobalSettings(userId: string): Promise<GlobalSettings> {
  if (!sql) return { ...DEFAULT_GLOBAL_SETTINGS };
  await maybeSchema();
  const rows = await sql`
    SELECT preferred_words, preferred_emojis FROM translate_user_settings WHERE user_id = ${userId}
  `;
  const r = rows[0] as { preferred_words: string[]; preferred_emojis: string[] } | undefined;
  if (!r) return { ...DEFAULT_GLOBAL_SETTINGS };
  return {
    preferredWords: Array.isArray(r.preferred_words) ? r.preferred_words : [],
    preferredEmojis: Array.isArray(r.preferred_emojis) ? r.preferred_emojis : []
  };
}

export async function pgSetGlobalSettings(
  userId: string,
  settings: Partial<GlobalSettings>
): Promise<GlobalSettings> {
  if (!sql) throw new Error("DATABASE_URL not set");
  await maybeSchema();
  const current = await pgGetGlobalSettings(userId);
  const next: GlobalSettings = {
    preferredWords: settings.preferredWords ?? current.preferredWords,
    preferredEmojis: settings.preferredEmojis ?? current.preferredEmojis
  };
  await sql`
    INSERT INTO translate_user_settings (user_id, preferred_words, preferred_emojis)
    VALUES (${userId}, ${JSON.stringify(next.preferredWords)}::jsonb, ${JSON.stringify(next.preferredEmojis)}::jsonb)
    ON CONFLICT (user_id) DO UPDATE SET
      preferred_words = EXCLUDED.preferred_words,
      preferred_emojis = EXCLUDED.preferred_emojis
  `;
  return next;
}

export async function pgGetRoles(userId: string): Promise<TranslateRole[]> {
  if (!sql) return [];
  await maybeSchema();
  const rows = await sql`
    SELECT id, name, traits, created_at::text
    FROM translate_roles WHERE user_id = ${userId} ORDER BY created_at
  `;
  return (rows as { id: string; name: string; traits: string[]; created_at: string }[]).map((r) => ({
    id: r.id,
    name: r.name,
    traits: Array.isArray(r.traits) ? r.traits : [],
    createdAt: r.created_at
  }));
}

export async function pgCreateRole(
  userId: string,
  name: string,
  traits: string[]
): Promise<TranslateRole> {
  if (!sql) throw new Error("DATABASE_URL not set");
  await maybeSchema();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const traitsArr = traits.map((t) => t.trim()).filter(Boolean);
  await sql`
    INSERT INTO translate_roles (id, user_id, name, traits, created_at)
    VALUES (${id}, ${userId}, ${name.trim()}, ${JSON.stringify(traitsArr)}::jsonb, ${now}::timestamptz)
  `;
  return { id, name: name.trim(), traits: traitsArr, createdAt: now };
}

export async function pgUpdateRole(
  userId: string,
  roleId: string,
  updates: { name?: string; traits?: string[] }
): Promise<TranslateRole | null> {
  if (!sql) return null;
  await maybeSchema();
  const roles = await pgGetRoles(userId);
  const role = roles.find((r) => r.id === roleId);
  if (!role) return null;
  const name = updates.name !== undefined ? updates.name.trim() : role.name;
  const traits =
    updates.traits !== undefined
      ? updates.traits.map((t) => t.trim()).filter(Boolean)
      : role.traits;
  await sql`
    UPDATE translate_roles SET name = ${name}, traits = ${JSON.stringify(traits)}::jsonb
    WHERE id = ${roleId} AND user_id = ${userId}
  `;
  return { ...role, name, traits };
}

export async function pgDeleteRole(userId: string, roleId: string): Promise<boolean> {
  if (!sql) return false;
  await maybeSchema();
  await sql`DELETE FROM translate_roles WHERE id = ${roleId} AND user_id = ${userId}`;
  await sql`DELETE FROM translate_learning WHERE user_id = ${userId} AND role_id = ${roleId}`;
  return true;
}

export async function pgAddLearningExample(
  userId: string,
  roleId: string,
  example: Omit<LearningExample, "at">
): Promise<void> {
  if (!sql) return;
  await maybeSchema();
  const at = new Date().toISOString();
  await sql`
    INSERT INTO translate_learning (user_id, role_id, original, translated, action, refined, at)
    VALUES (${userId}, ${roleId}, ${example.original}, ${example.translated}, ${example.action}, ${example.refined ?? null}, ${at}::timestamptz)
  `;
  await sql`
    DELETE FROM translate_learning a WHERE a.user_id = ${userId} AND a.role_id = ${roleId}
    AND a.at < (SELECT min(b.at) FROM (SELECT at FROM translate_learning WHERE user_id = ${userId} AND role_id = ${roleId} ORDER BY at DESC LIMIT 50) b)
  `;
}

export async function pgGetLearningExamples(
  userId: string,
  roleId: string
): Promise<LearningExample[]> {
  if (!sql) return [];
  await maybeSchema();
  const rows = await sql`
    SELECT original, translated, action, refined, at::text
    FROM translate_learning WHERE user_id = ${userId} AND role_id = ${roleId}
    ORDER BY at DESC LIMIT 50
  `;
  return (rows as { original: string; translated: string; action: string; refined: string | null; at: string }[])
    .reverse()
    .map((r) => ({
      original: r.original,
      translated: r.translated,
      action: r.action as "copy" | "refine",
      refined: r.refined ?? undefined,
      at: r.at
    }));
}

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_MAX_PER_MESSAGE = 200;
const DEFAULT_MAX_PER_DAY = 2000;

export interface UserLimits {
  maxPerMessage: number;
  maxPerDay: number;
}

export async function pgGetUserLimits(userId: string): Promise<UserLimits> {
  if (!sql) return { maxPerMessage: DEFAULT_MAX_PER_MESSAGE, maxPerDay: DEFAULT_MAX_PER_DAY };
  await maybeSchema();
  const rows = await sql`
    SELECT max_per_message, max_per_day FROM translate_user_limits WHERE user_id = ${userId}
  `;
  const r = rows[0] as { max_per_message: number; max_per_day: number } | undefined;
  if (!r) return { maxPerMessage: DEFAULT_MAX_PER_MESSAGE, maxPerDay: DEFAULT_MAX_PER_DAY };
  return { maxPerMessage: r.max_per_message, maxPerDay: r.max_per_day };
}

export async function pgSetUserLimits(
  userId: string,
  limits: { maxPerMessage?: number; maxPerDay?: number }
): Promise<UserLimits> {
  if (!sql) throw new Error("DATABASE_URL not set");
  await maybeSchema();
  const current = await pgGetUserLimits(userId);
  const maxPerMessage = limits.maxPerMessage ?? current.maxPerMessage;
  const maxPerDay = limits.maxPerDay ?? current.maxPerDay;
  await sql`
    INSERT INTO translate_user_limits (user_id, max_per_message, max_per_day)
    VALUES (${userId}, ${maxPerMessage}, ${maxPerDay})
    ON CONFLICT (user_id) DO UPDATE SET
      max_per_message = ${maxPerMessage},
      max_per_day = ${maxPerDay}
  `;
  return { maxPerMessage, maxPerDay };
}

export interface UserWithLimits {
  id: string;
  email: string;
  maxPerMessage: number;
  maxPerDay: number;
}

export async function pgListUsersWithLimits(): Promise<UserWithLimits[]> {
  if (!sql) return [];
  await maybeSchema();
  const rows = await sql`
    SELECT u.id, u.email,
      COALESCE(l.max_per_message, ${DEFAULT_MAX_PER_MESSAGE}) AS max_per_message,
      COALESCE(l.max_per_day, ${DEFAULT_MAX_PER_DAY}) AS max_per_day
    FROM translate_users u
    LEFT JOIN translate_user_limits l ON l.user_id = u.id
    ORDER BY u.email
  `;
  return (rows as { id: string; email: string; max_per_message: number; max_per_day: number }[]).map((r) => ({
    id: r.id,
    email: r.email,
    maxPerMessage: r.max_per_message,
    maxPerDay: r.max_per_day
  }));
}

export async function pgGetDailyUsage(userId: string): Promise<{ used: number; limit: number }> {
  if (!sql) return { used: 0, limit: DEFAULT_MAX_PER_DAY };
  await maybeSchema();
  const today = todayDateStr();
  const usageRows = await sql`
    SELECT chars_used FROM translate_user_usage WHERE user_id = ${userId} AND usage_date = ${today}::date
  `;
  const used = (usageRows[0] as { chars_used: number } | undefined)?.chars_used ?? 0;
  const { maxPerDay } = await pgGetUserLimits(userId);
  return { used, limit: maxPerDay };
}

export async function pgCheckAndAddUsage(
  userId: string,
  chars: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!sql) return { ok: true };
  await maybeSchema();
  const { maxPerDay } = await pgGetUserLimits(userId);
  const today = todayDateStr();
  const rows = await sql`
    INSERT INTO translate_user_usage (user_id, usage_date, chars_used)
    VALUES (${userId}, ${today}::date, ${chars})
    ON CONFLICT (user_id, usage_date) DO UPDATE SET chars_used = translate_user_usage.chars_used + ${chars}
    RETURNING chars_used
  `;
  const used = (rows[0] as { chars_used: number }).chars_used;
  if (used > maxPerDay) {
    await sql`
      UPDATE translate_user_usage SET chars_used = chars_used - ${chars}
      WHERE user_id = ${userId} AND usage_date = ${today}::date
    `;
    return { ok: false, error: `Daily limit (${maxPerDay} characters) reached. Resets at midnight.` };
  }
  return { ok: true };
}
