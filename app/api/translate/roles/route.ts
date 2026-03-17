import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/translate-auth";
import { getRoles, createRole } from "@/lib/translate-store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  const roles = await getRoles(session.userId);
  return NextResponse.json({ ok: true, data: roles });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({})) as { name?: string; traits?: string[] };
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const traits = Array.isArray(body?.traits) ? body.traits : [];
    if (!name) {
      return NextResponse.json({ ok: false, error: "Role name required" }, { status: 400 });
    }
    const role = await createRole(session.userId, name, traits);
    return NextResponse.json({ ok: true, data: role });
  } catch (e) {
    console.error("POST /api/translate/roles error:", e);
    const msg = e instanceof Error ? e.message : "Add role failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
