import { NextRequest, NextResponse } from "next/server";
import {
  scoreBlueprint,
  isGeminiConfigured,
  type BlueprintScores
} from "@/lib/gemini";
import { ApiResponse } from "@/lib/types";

function mockScores(
  _content: string,
  hasPrevious?: boolean
): BlueprintScores {
  const reasons = {
    clarity: "Problem and solution are clearly stated.",
    feasibility: "MVP is buildable with common stack.",
    scope: "Scope is focused for an MVP.",
    edge: "Some differentiation from existing solutions.",
    value: "Clear value for target users."
  };
  const changeReasons = hasPrevious
    ? {
        clarity: "No change from previous version.",
        feasibility: "Scope tightened, more feasible.",
        scope: "Features narrowed.",
        edge: "No change.",
        value: "Stronger value proposition."
      }
    : undefined;
  return {
    clarity: 10,
    feasibility: 10,
    scope: 9,
    edge: 8,
    value: 10,
    reasons,
    changeReasons
  };
}

export async function POST(req: NextRequest) {
  try {
    const { blueprintContent, previousBlueprintContent } = (await req.json()) as {
      blueprintContent?: string;
      previousBlueprintContent?: string;
    };

    if (!blueprintContent || !blueprintContent.trim()) {
      return NextResponse.json<ApiResponse<never>>(
        { ok: false, error: "Blueprint content is required." },
        { status: 400 }
      );
    }

    if (!isGeminiConfigured) {
      return NextResponse.json<ApiResponse<BlueprintScores>>(
        {
          ok: true,
          data: mockScores(
            blueprintContent,
            !!previousBlueprintContent?.trim()
          )
        },
        { status: 200 }
      );
    }

    const data = await scoreBlueprint(
      blueprintContent,
      previousBlueprintContent?.trim() || undefined
    );
    return NextResponse.json<ApiResponse<BlueprintScores>>(
      { ok: true, data },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json<ApiResponse<never>>(
      { ok: false, error: "Failed to score blueprint." },
      { status: 500 }
    );
  }
}
