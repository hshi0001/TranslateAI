import { NextRequest, NextResponse } from "next/server";
import {
  getRedBlueFeedback,
  isGeminiConfigured,
  type RedBlueFeedback
} from "@/lib/gemini";
import { ApiResponse } from "@/lib/types";

function normalizeFeedback(raw: { red?: unknown; blue?: unknown }): RedBlueFeedback {
  const toArr = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.map((x) => String(x).trim()).filter(Boolean)
      : typeof v === "string"
        ? v.split(/\n/).map((s) => s.replace(/^[-*]\s*/, "").trim()).filter(Boolean)
        : [];
  return {
    red: toArr(raw.red ?? []),
    blue: toArr(raw.blue ?? [])
  };
}

function mockFeedback(): RedBlueFeedback {
  return normalizeFeedback({
    red: [
      "MVP scope may be too broad for first release.",
      "Tech stack not clearly bounded."
    ],
    blue: [
      "Narrow MVP to 3 core features only.",
      "Add explicit out-of-scope section to the blueprint."
    ]
  });
}

export async function POST(req: NextRequest) {
  try {
    const { blueprintContent } = (await req.json()) as {
      blueprintContent?: string;
    };

    if (!blueprintContent || !blueprintContent.trim()) {
      return NextResponse.json<ApiResponse<never>>(
        { ok: false, error: "Blueprint content is required." },
        { status: 400 }
      );
    }

    if (!isGeminiConfigured) {
      return NextResponse.json<ApiResponse<RedBlueFeedback>>(
        { ok: true, data: mockFeedback() },
        { status: 200 }
      );
    }

    const raw = await getRedBlueFeedback(blueprintContent);
    const data = normalizeFeedback(raw);
    return NextResponse.json<ApiResponse<RedBlueFeedback>>(
      { ok: true, data },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json<ApiResponse<never>>(
      { ok: false, error: "Failed to get feedback." },
      { status: 500 }
    );
  }
}
