import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/translate-auth";
import { getGlobalSettings, setGlobalSettings } from "@/lib/translate-store";
import type { GlobalSettings } from "@/lib/translate-types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  const settings = await getGlobalSettings(session.userId);
  return NextResponse.json({ ok: true, data: settings });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  const body = (await req.json()) as Partial<GlobalSettings>;
  const settings = await setGlobalSettings(session.userId, {
    preferredWords: body.preferredWords,
    preferredEmojis: body.preferredEmojis
  });
  return NextResponse.json({ ok: true, data: settings });
}
