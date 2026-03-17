import type { GlobalSettings, TranslateRole, LearningExample } from "./translate-types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Default to Gemini 2.5 Pro; override via GEMINI_MODEL if needed.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

export const isTranslateGeminiConfigured = !!GEMINI_API_KEY;

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const url = (model: string) =>
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
      }
    ]
  };

  const modelToUse = GEMINI_MODEL;
  const maxRetries = 2;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url(modelToUse), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        // If it's a 5xx (often 503 \"high demand\"), retry a couple of times.
        if (response.status >= 500 && response.status < 600 && attempt < maxRetries) {
          const backoffMs = 300 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }
        throw new Error(`Gemini API error: ${response.status} ${text}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }>;
      };
      const first = data.candidates?.[0];
      const text =
        first?.content?.parts?.map((p: { text: string }) => p.text).join("") ?? "";
      if (!text) throw new Error("Gemini API returned empty response");
      return text.trim();
    } catch (e) {
      lastError = e;
      // For network errors or other exceptions, retry up to maxRetries.
      if (attempt < maxRetries) {
        const backoffMs = 300 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("Gemini API failed after retries");
}

function buildContext(
  settings: GlobalSettings,
  role: TranslateRole | null,
  learningExamples: LearningExample[]
): string {
  const parts: string[] = [];
  if (settings.preferredWords?.length) {
    parts.push(
      `Preferred words (use when appropriate): ${settings.preferredWords.join(", ")}.`
    );
  }
  if (settings.preferredEmojis?.length) {
    parts.push(
      `Preferred emojis (use when appropriate): ${settings.preferredEmojis.join(" ")}.`
    );
  }
  if (role) {
    parts.push(
      `Translation role: "${role.name}". Style/traits: ${role.traits.length ? role.traits.join(", ") : "neutral"}.`
    );
  }
  if (learningExamples.length > 0) {
    parts.push(
      "Learn from these user-approved examples (match this style and tone):"
    );
    learningExamples.slice(-15).forEach((ex, i) => {
      parts.push(`Example ${i + 1}:`);
      parts.push(`Original: ${ex.original}`);
      parts.push(`Translation: ${ex.refined ?? ex.translated}`);
    });
  }
  return parts.join("\n");
}

export async function translateText(
  text: string,
  targetLang: string,
  settings: GlobalSettings,
  role: TranslateRole | null,
  learningExamples: LearningExample[]
): Promise<string> {
  const context = buildContext(settings, role, learningExamples);
  const systemPrompt = `You are a translator. Your response must be exactly one thing: the translation of the user's text into ${targetLang}. Do not add any preamble, explanation, alternatives, or suggestions. Do not say "Translation:" or "Here is". Output only the translated text, nothing else.${context ? `\n\n${context}` : ""}`;
  const userPrompt = text;
  return stripFluff(await callGemini(systemPrompt, userPrompt));
}

function stripFluff(raw: string): string {
  let s = raw.trim();
  const prefixes = [
    /^translation:\s*/i,
    /^here (?:is|'s) (?:the )?(?:translation|refined text):\s*/i,
    /^refined (?:text|version):\s*/i,
    /^output:\s*/i,
    /^result:\s*/i,
    /^["']?(?:translation|refined)["']?\s*:\s*/i
  ];
  for (const p of prefixes) {
    s = s.replace(p, "").trim();
  }
  return s;
}

export async function refineText(
  text: string,
  instruction: string,
  settings: GlobalSettings,
  role: TranslateRole | null,
  learningExamples: LearningExample[]
): Promise<string> {
  const context = buildContext(settings, role, learningExamples);
  const systemPrompt = `You refine text according to the user's instruction. Your response must be exactly one thing: the refined text. Do not add any preamble, explanation, alternatives, or suggestions. Do not say "Refined:" or "Here is". Output only the refined text, nothing else.${context ? `\n\n${context}` : ""}`;
  const userPrompt = `Instruction: ${instruction}\n\nText:\n${text}`;
  return stripFluff(await callGemini(systemPrompt, userPrompt));
}

export async function translateOrRefine(
  text: string,
  mode: "translate" | "refine",
  targetLang: string,
  settings: GlobalSettings,
  role: TranslateRole | null,
  learningExamples: LearningExample[]
): Promise<string> {
  if (mode === "refine") {
    return refineText(text, "Improve clarity, tone, and natural expression.", settings, role, learningExamples);
  }
  return translateText(text, targetLang, settings, role, learningExamples);
}

const DETECT_LANGUAGE_NAMES = [
  "English", "Chinese", "Japanese", "Korean",
  "Spanish", "French", "German", "Portuguese", "Russian", "Arabic"
];

export async function detectLanguage(text: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");
  const systemPrompt = "You identify the language of the given text. Reply with exactly one of these names, nothing else: English, Chinese, Japanese, Korean, Spanish, French, German, Portuguese, Russian, Arabic.";
  const userPrompt = text.slice(0, 2000);
  const raw = await callGemini(systemPrompt, userPrompt);
  const normalized = raw.trim().split(/[\n,.]/)[0].trim();
  const match = DETECT_LANGUAGE_NAMES.find(
    (name) => name.toLowerCase() === normalized.toLowerCase()
  );
  return match ?? "English";
}
