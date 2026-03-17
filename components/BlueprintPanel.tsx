"use client";

import type { BlueprintVersion } from "@/lib/types";

interface BlueprintPanelProps {
  blueprint?: BlueprintVersion;
}

export function BlueprintPanel({ blueprint }: BlueprintPanelProps) {
  if (!blueprint) {
    return (
      <div className="flex-1 flex items-center justify-center text-[13px] text-gray-400">
        No blueprint. Generate one from home.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {blueprint.changesSummary && (
        <div className="flex-shrink-0 px-3 py-1.5 border-b border-gray-200 bg-amber-50/80 text-[11px] text-amber-900/90">
          {blueprint.changesSummary}
        </div>
      )}
      <article className="flex-1 overflow-auto px-4 py-3 text-[13px] whitespace-pre-wrap leading-relaxed font-mono text-foreground bg-white">
        {blueprint.content}
      </article>
    </div>
  );
}

