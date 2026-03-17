import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser, findUserByEmail } from "@/lib/translate-store";
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
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(email.trim(), passwordHash);
    const token = await createSession(user.id, user.email);
    await setSessionCookie(token);
    return NextResponse.json({
      ok: true,
      data: { userId: user.id, email: user.email }
    });
  } catch (e) {
    if (e instanceof Error && e.message === "EMAIL_IN_USE") {
      return NextResponse.json(
        { ok: false, error: "Email already registered" },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Registration failed" },
      { status: 500 }
    );
  }
}
