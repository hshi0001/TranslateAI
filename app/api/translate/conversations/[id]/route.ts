import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/translate-auth";
import { getConversation, deleteConversation } from "@/lib/translate-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  const { id } = await params;
  const conv = await getConversation(session.userId, id);
  if (!conv) {
    return NextResponse.json({ ok: false, error: "Conversation not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: conv });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  const { id } = await params;
  const conv = await getConversation(session.userId, id);
  if (!conv) {
    return NextResponse.json({ ok: false, error: "Conversation not found" }, { status: 404 });
  }
  await deleteConversation(session.userId, id);
  return NextResponse.json({ ok: true });
}
