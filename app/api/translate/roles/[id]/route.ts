import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/translate-auth";
import { updateRole, deleteRole, getRoles } from "@/lib/translate-store";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json()) as { name?: string; traits?: string[] };
  const role = await updateRole(session.userId, id, {
    name: body.name,
    traits: body.traits
  });
  if (!role) {
    return NextResponse.json({ ok: false, error: "Role not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: role });
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
  const roles = await getRoles(session.userId);
  if (!roles.some((r) => r.id === id)) {
    return NextResponse.json({ ok: false, error: "Role not found" }, { status: 404 });
  }
  await deleteRole(session.userId, id);
  return NextResponse.json({ ok: true });
}
