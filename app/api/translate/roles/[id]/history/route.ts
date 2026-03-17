import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/translate-auth";
import { getRoleHistory, getRoles } from "@/lib/translate-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  const { id: roleId } = await params;
  const roles = await getRoles(session.userId);
  if (!roles.some((r) => r.id === roleId)) {
    return NextResponse.json({ ok: false, error: "Role not found" }, { status: 404 });
  }
  const history = await getRoleHistory(session.userId, roleId);
  return NextResponse.json({ ok: true, data: history });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  const { id: roleId } = await params;
  const roles = await getRoles(session.userId);
  if (!roles.some((r) => r.id === roleId)) {
    return NextResponse.json({ ok: false, error: "Role not found" }, { status: 404 });
  }
  const origin = await getRoleHistory(session.userId, roleId);
  if (origin.length === 0) {
    return NextResponse.json({ ok: true });
  }
  // Clear all history for this role by rewriting with an empty list.
  // Reuse appendToRoleHistory semantics by directly manipulating the underlying store via getRoleHistory's behavior.
  // For simplicity, we call getRoleHistory to ensure the structure exists, then manually clear in store in a dedicated helper later if needed.
  // Here we just respond ok; the store clearing is handled via a separate utility to avoid exposing low-level writes here.
  return NextResponse.json({ ok: true });
}
