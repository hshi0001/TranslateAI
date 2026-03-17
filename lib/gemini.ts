import {
  exportBuildPackPrompt,
  exportBuildPackSystemPrompt,
  generateBlueprintFromIdeaPrompt,
  generateBlueprintSystemPrompt,
  refineBlueprintPrompt,
  refineBlueprintSystemPrompt,
  redBlueFeedbackPrompt,
  redBlueFeedbackSystemPrompt,
  scoreBlueprintPrompt,
  scoreBlueprintSystemPrompt
} from "./prompts";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Allow overriding model via env; default to a commonly available model.
const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-pro";

export const isGeminiConfigured = !!GEMINI_API_KEY;

interface GeminiRequestOptions {
  systemPrompt: string;
  userPrompt: string;
}

async function callGemini({
  systemPrompt,
  userPrompt
}: GeminiRequestOptions): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as any;
  const text =
    data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ??
    "";

  if (!text) {
    throw new Error("Gemini API returned empty response");
  }

  return text;
}

export async function generateBlueprintFromIdea(
  idea: string
): Promise<string> {
  const userPrompt = generateBlueprintFromIdeaPrompt(idea);
  return callGemini({
    systemPrompt: generateBlueprintSystemPrompt,
    userPrompt
  });
}

export async function refineBlueprint(
  currentBlueprint: string,
  userInstruction: string
): Promise<string> {
  const userPrompt = refineBlueprintPrompt(currentBlueprint, userInstruction);
  return callGemini({
    systemPrompt: refineBlueprintSystemPrompt,
    userPrompt
  });
}

export async function exportBuildPack(
  currentBlueprint: string
): Promise<string> {
  const userPrompt = exportBuildPackPrompt(currentBlueprint);
  return callGemini({
    systemPrompt: exportBuildPackSystemPrompt,
    userPrompt
  });
}

const DIM_KEYS = ["clarity", "feasibility", "scope", "edge", "value"] as const;

export interface BlueprintScores {
  clarity: number;
  feasibility: number;
  scope: number;
  edge: number;
  value: number;
  reasons: Record<string, string>;
  changeReasons?: Record<string, string>;
}

function str(v: unknown): string {
  if (typeof v === "string") return v.trim().slice(0, 500);
  return String(v ?? "").trim().slice(0, 500);
}

export async function scoreBlueprint(
  blueprintContent: string,
  previousBlueprintContent?: string
): Promise<BlueprintScores> {
  const userPrompt = scoreBlueprintPrompt(
    blueprintContent,
    previousBlueprintContent
  );
  const text = await callGemini({
    systemPrompt: scoreBlueprintSystemPrompt,
    userPrompt
  });
  const cleaned = text.replace(/```json?\s*/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : cleaned;
  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  const clamp = (n: number) => Math.min(20, Math.max(0, Math.round(Number(n))));
  const reasons: Record<string, string> = {};
  const rawReasons = parsed.reasons as Record<string, unknown> | undefined;
  for (const k of DIM_KEYS) {
    reasons[k] = rawReasons?.[k] != null ? str(rawReasons[k]) : "";
  }
  let changeReasons: Record<string, string> | undefined;
  if (previousBlueprintContent?.trim()) {
    changeReasons = {};
    const raw =
      parsed.changeReasons && typeof parsed.changeReasons === "object"
        ? (parsed.changeReasons as Record<string, unknown>)
        : {};
    for (const k of DIM_KEYS) {
      changeReasons[k] = raw[k] != null ? str(raw[k]) : "";
    }
  }
  return {
    clarity: clamp(Number(parsed.clarity ?? 0)),
    feasibility: clamp(Number(parsed.feasibility ?? 0)),
    scope: clamp(Number(parsed.scope ?? 0)),
    edge: clamp(Number(parsed.edge ?? 0)),
    value: clamp(Number(parsed.value ?? 0)),
    reasons,
    changeReasons
  };
}

export interface RedBlueFeedback {
  red: string[];
  blue: string[];
}

function ensureStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof v === "string") {
    return v.split(/\n/).map((s) => s.replace(/^[-*]\s*/, "").trim()).filter(Boolean);
  }
  return [];
}

export async function getRedBlueFeedback(
  blueprintContent: string
): Promise<RedBlueFeedback> {
  const userPrompt = redBlueFeedbackPrompt(blueprintContent);
  const text = await callGemini({
    systemPrompt: redBlueFeedbackSystemPrompt,
    userPrompt
  });
  const cleaned = text.replace(/```json?\s*/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : cleaned;
  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  return {
    red: ensureStringArray(parsed.red ?? parsed.Red ?? []),
    blue: ensureStringArray(parsed.blue ?? parsed.Blue ?? [])
  };
}

