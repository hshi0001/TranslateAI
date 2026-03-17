import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/translate-store";
import { createSession, setSessionCookie } from "@/lib/translate-auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };
    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Email and password required" },
        { status: 400 }
      );
    }
    const user = await findUserByEmail(email.trim());
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }
    const token = await createSession(user.id, user.email);
    await setSessionCookie(token);
    return NextResponse.json({
      ok: true,
      data: { userId: user.id, email: user.email }
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Sign in failed" },
      { status: 500 }
    );
  }
}
