import { NextResponse } from "next/server";
import { getSession, isAdminEmail } from "@/lib/translate-auth";
import { listUsersWithLimits } from "@/lib/translate-store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  if (!isAdminEmail(session.email)) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  const users = await listUsersWithLimits();
  return NextResponse.json({ ok: true, data: users });
}
