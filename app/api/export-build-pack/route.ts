import { NextRequest, NextResponse } from "next/server";
import { exportBuildPack as exportWithGemini, isGeminiConfigured } from "@/lib/gemini";
import { ApiResponse } from "@/lib/types";
import { MOCK_BUILD_PACK } from "@/lib/mockData";

interface BuildPack {
  readme: string;
  architecture: string;
  roadmap: string;
  cursorPrompts: string;
}

export async function POST(req: NextRequest) {
  try {
    const { currentBlueprint } = (await req.json()) as {
      currentBlueprint?: string;
    };

    if (!currentBlueprint || !currentBlueprint.trim()) {
      return NextResponse.json<ApiResponse<never>>(
        { ok: false, error: "Current blueprint is required." },
        { status: 400 }
      );
    }

    if (!isGeminiConfigured) {
      return NextResponse.json<ApiResponse<BuildPack>>(
        { ok: true, data: MOCK_BUILD_PACK },
        { status: 200 }
      );
    }

    const raw = await exportWithGemini(currentBlueprint);

    // Very lightweight parsing: split by headings. If parsing fails, return all in README.
    const sections = {
      readme: "",
      architecture: "",
      roadmap: "",
      cursorPrompts: ""
    };

    const parts = raw.split(/^(\d\.\s.+)$/m);
    if (parts.length >= 3) {
      let currentKey: keyof typeof sections | null = null;
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.startsWith("1. README.md")) {
          currentKey = "readme";
          continue;
        }
        if (trimmed.startsWith("2. architecture.md")) {
          currentKey = "architecture";
          continue;
        }
        if (trimmed.startsWith("3. roadmap.md")) {
          currentKey = "roadmap";
          continue;
        }
        if (trimmed.startsWith("4. cursor_prompts.md")) {
          currentKey = "cursorPrompts";
          continue;
        }
        if (currentKey) {
          sections[currentKey] += (sections[currentKey] ? "\n" : "") + part;
        }
      }
    } else {
      sections.readme = raw;
    }

    return NextResponse.json<ApiResponse<BuildPack>>(
      { ok: true, data: sections },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json<ApiResponse<never>>(
      {
        ok: false,
        error:
          "Failed to export build pack. Please try again from the workspace."
      },
      { status: 500 }
    );
  }
}

