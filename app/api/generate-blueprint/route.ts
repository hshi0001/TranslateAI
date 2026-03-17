import { NextRequest, NextResponse } from "next/server";
import { generateBlueprintFromIdea, isGeminiConfigured } from "@/lib/gemini";
import { MOCK_INITIAL_BLUEPRINT } from "@/lib/mockData";
import { ApiResponse, BlueprintVersion } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { idea } = (await req.json()) as { idea?: string };

    if (!idea || !idea.trim()) {
      return NextResponse.json<ApiResponse<never>>(
        { ok: false, error: "Idea is required." },
        { status: 400 }
      );
    }

    if (!isGeminiConfigured) {
      const mockBlueprint = MOCK_INITIAL_BLUEPRINT(idea);
      return NextResponse.json<ApiResponse<BlueprintVersion>>(
        { ok: true, data: mockBlueprint },
        { status: 200 }
      );
    }

    const content = await generateBlueprintFromIdea(idea);
    const now = new Date().toISOString();
    const blueprint: BlueprintVersion = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      label: "v1 – Initial blueprint",
      rawIdea: idea,
      content,
      changesSummary: "Initial blueprint generated from your idea."
    };

    return NextResponse.json<ApiResponse<BlueprintVersion>>(
      { ok: true, data: blueprint },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json<ApiResponse<never>>(
      {
        ok: false,
        error:
          "Failed to generate blueprint. Please try again or refine your idea."
      },
      { status: 500 }
    );
  }
}

