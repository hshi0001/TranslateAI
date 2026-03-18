import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdminEmail } from "@/lib/translate-auth";
import { setUserLimits } from "@/lib/translate-store";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  if (!isAdminEmail(session.email)) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  const { userId } = await params;
  const body = (await req.json()) as { maxPerMessage?: number; maxPerDay?: number };
  const maxPerMessage = body.maxPerMessage != null ? Number(body.maxPerMessage) : undefined;
  const maxPerDay = body.maxPerDay != null ? Number(body.maxPerDay) : undefined;
  if (
    (maxPerMessage != null && (maxPerMessage < 1 || maxPerMessage > 10000)) ||
    (maxPerDay != null && (maxPerDay < 1 || maxPerDay > 1000000))
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid limits (maxPerMessage 1–10000, maxPerDay 1–1000000)" },
      { status: 400 }
    );
  }
  try {
    const limits = await setUserLimits(userId, { maxPerMessage, maxPerDay });
    return NextResponse.json({ ok: true, data: limits });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update limits";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
