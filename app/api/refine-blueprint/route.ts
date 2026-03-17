import { NextRequest, NextResponse } from "next/server";
import {
  refineBlueprint as refineWithGemini,
  isGeminiConfigured
} from "@/lib/gemini";
import { MOCK_REFINED_BLUEPRINT } from "@/lib/mockData";
import { ApiResponse, BlueprintVersion } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { currentBlueprint, userInstruction } = (await req.json()) as {
      currentBlueprint?: BlueprintVersion;
      userInstruction?: string;
    };

    if (!currentBlueprint || !currentBlueprint.content) {
      return NextResponse.json<ApiResponse<never>>(
        { ok: false, error: "Current blueprint is required." },
        { status: 400 }
      );
    }

    if (!userInstruction || !userInstruction.trim()) {
      return NextResponse.json<ApiResponse<never>>(
        { ok: false, error: "Refinement instruction is required." },
        { status: 400 }
      );
    }

    if (!isGeminiConfigured) {
      const refined = MOCK_REFINED_BLUEPRINT(
        currentBlueprint,
        userInstruction
      );
      return NextResponse.json<ApiResponse<BlueprintVersion>>(
        { ok: true, data: refined },
        { status: 200 }
      );
    }

    const content = await refineWithGemini(
      currentBlueprint.content,
      userInstruction
    );
    const now = new Date().toISOString();
    const refined: BlueprintVersion = {
      ...currentBlueprint,
      id: crypto.randomUUID(),
      version: currentBlueprint.version + 1,
      updatedAt: now,
      content,
      label: `v${currentBlueprint.version + 1}`,
      changesSummary: "See 'Changes in this version' section at the top."
    };

    return NextResponse.json<ApiResponse<BlueprintVersion>>(
      { ok: true, data: refined },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json<ApiResponse<never>>(
      {
        ok: false,
        error:
          "Failed to refine blueprint. Please try again or adjust your request."
      },
      { status: 500 }
    );
  }
}

