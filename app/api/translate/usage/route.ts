import { NextResponse } from "next/server";
import { getSession } from "@/lib/translate-auth";
import { getDailyUsage } from "@/lib/translate-store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  const { used, limit } = await getDailyUsage(session.userId);
  return NextResponse.json({ ok: true, data: { used, limit } });
}
