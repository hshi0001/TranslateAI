import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/translate-auth";
import {
  getGlobalSettings,
  getRoles,
  getLearningExamples,
  appendToConversation,
  createConversation,
  getConversation,
  appendToRoleHistory
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
  let conversationId = body.conversationId?.trim();
  if (conversationId) {
    const existing = await getConversation(session.userId, conversationId);
    if (!existing) conversationId = undefined;
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

    if (conversationId) {
      const out = await appendToConversation(
        session.userId,
        conversationId,
        [
          { role: "user", content: text },
          { role: "assistant", content: result }
        ],
        { updateTitleFromFirstUserMessage: true }
      );
      if (!out) {
        return NextResponse.json({ ok: false, error: "Conversation not found" }, { status: 404 });
      }
    }

    if (role) {
      await appendToRoleHistory(session.userId, role.id, {
        original: text,
        result,
        mode,
        threadId: assistantId
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        result,
        conversationId: conversationId ?? null,
        title: null,
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
