import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/translate-auth";
import { listConversations, createConversation } from "@/lib/translate-store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  const list = await listConversations(session.userId);
  return NextResponse.json({ ok: true, data: list });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  const body = (await req.json()) as { title?: string };
  const conv = await createConversation(session.userId, body.title?.trim() || "New chat");
  return NextResponse.json({ ok: true, data: conv });
}
