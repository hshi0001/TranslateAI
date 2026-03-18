import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/translate-auth";
import {
  getGlobalSettings,
  getRoles,
  getLearningExamples,
  checkAndAddUsage,
  getUserLimits
} from "@/lib/translate-store";
import {
  translateOrRefine,
  detectLanguage,
  isTranslateGeminiConfigured
} from "@/lib/translate-gemini";

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
    roleId?: string;
    mode?: "translate" | "refine";
    targetLang?: string;
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
  const targetLang = (body.targetLang ?? "English").trim();
  const settings = await getGlobalSettings(session.userId);
  const roles = await getRoles(session.userId);
  const role = body.roleId
    ? roles.find((r) => r.id === body.roleId) ?? null
    : null;
  const learningExamples = role
    ? await getLearningExamples(session.userId, role.id)
    : [];
  let mode: "translate" | "refine" = body.mode === "refine" ? "refine" : "translate";
  if (body.mode !== "refine") {
    try {
      const detected = await detectLanguage(text);
      if (detected === targetLang) mode = "refine";
    } catch {
      // keep translate on detect failure
    }
  }
  try {
    const result = await translateOrRefine(
      text,
      mode,
      targetLang,
      settings,
      role,
      learningExamples
    );
    const now = new Date().toISOString();
    const assistantId = crypto.randomUUID();
    const userMsg = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: text,
      createdAt: now
    };
    const assistantMsg = {
      id: assistantId,
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
      e instanceof Error ? e.message : "Translation failed";
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
