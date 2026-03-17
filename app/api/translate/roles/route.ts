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
  const { name, traits } = (await req.json()) as { name?: string; traits?: string[] };
  if (!name?.trim()) {
    return NextResponse.json({ ok: false, error: "Role name required" }, { status: 400 });
  }
  const role = await createRole(
    session.userId,
    name.trim(),
    Array.isArray(traits) ? traits : []
  );
  return NextResponse.json({ ok: true, data: role });
}
