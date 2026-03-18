import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/translate-auth";
import {
  getGlobalSettings,
  getRoles,
  getLearningExamples,
  checkAndAddUsage,
  getUserLimits
} from "@/lib/translate-store";
import { refineText, isTranslateGeminiConfigured } from "@/lib/translate-gemini";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  if (!isTranslateGeminiConfigured) {
    return NextResponse.json(
      { ok: false, error: "GEMINI_API_KEY not configured" },
      { status: 503 }
    );
  }
  const body = (await req.json()) as {
    text?: string;
    instruction?: string;
    roleId?: string;
    conversationId?: string;
  };
  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json(
      { ok: false, error: "Text required" },
      { status: 400 }
    );
  }
  const limits = await getUserLimits(session.userId);
  if (text.length > limits.maxPerMessage) {
    return NextResponse.json(
      { ok: false, error: `Max ${limits.maxPerMessage} characters per message` },
      { status: 400 }
    );
  }
  const usageResult = await checkAndAddUsage(session.userId, text.length);
  if (!usageResult.ok) {
    return NextResponse.json(
      { ok: false, error: usageResult.error },
      { status: 400 }
    );
  }
  const instruction = (body.instruction ?? "Improve clarity and tone, keep meaning.").trim();
  const settings = await getGlobalSettings(session.userId);
  const roles = await getRoles(session.userId);
  const role = body.roleId
    ? roles.find((r) => r.id === body.roleId) ?? null
    : null;
  const learningExamples = role
    ? await getLearningExamples(session.userId, role.id)
    : [];
  try {
    const result = await refineText(
      text,
      instruction,
      settings,
      role,
      learningExamples
    );
    const now = new Date().toISOString();
    const refineLabel = instruction ? `Refine: ${instruction}` : "Refine";
    const userMsg = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: refineLabel,
      createdAt: now
    };
    const assistantMsg = {
      id: crypto.randomUUID(),
      role: "assistant" as const,
      content: result,
      createdAt: now
    };

    return NextResponse.json({
      ok: true,
      data: {
        result,
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        learningExamplesUsed: learningExamples.length,
        roleName: role?.name ?? null
      }
    });
  } catch (e) {
    console.error(e);
    const message =
      e instanceof Error ? e.message : "Refine failed";
    if (message.includes("503") || message.includes("UNAVAILABLE")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Translation service is temporarily busy. Please wait a few seconds and try again."
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
