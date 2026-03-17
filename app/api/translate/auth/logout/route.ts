import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/translate-auth";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
