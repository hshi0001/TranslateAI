import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/translate-auth";
import { addLearningExample, getRoles } from "@/lib/translate-store";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  const body = (await req.json()) as {
    roleId?: string;
    original: string;
    translated: string;
    action: "copy" | "refine";
    refined?: string;
  };
  const { roleId, original, translated, action, refined } = body;
  if (!original?.trim() || !translated?.trim() || !action) {
    return NextResponse.json(
      { ok: false, error: "original, translated, and action required" },
      { status: 400 }
    );
  }
  if (action !== "copy" && action !== "refine") {
    return NextResponse.json(
      { ok: false, error: "action must be copy or refine" },
      { status: 400 }
    );
  }
  const roles = await getRoles(session.userId);
  const effectiveRoleId = roleId && roles.some((r) => r.id === roleId) ? roleId : null;
  if (!effectiveRoleId) {
    return NextResponse.json(
      { ok: false, error: "Select a role to record learning" },
      { status: 400 }
    );
  }
  await addLearningExample(session.userId, effectiveRoleId, {
    original: original.trim(),
    translated: translated.trim(),
    action,
    refined: action === "refine" && refined?.trim() ? refined.trim() : undefined
  });
  return NextResponse.json({ ok: true });
}
