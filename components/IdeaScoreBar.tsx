"use client";

import { useEffect, useState, useRef } from "react";
import type { BlueprintVersion } from "@/lib/types";

const DIMS = [
  { key: "clarity", label: "Clarity" },
  { key: "feasibility", label: "Feasibility" },
  { key: "scope", label: "Scope" },
  { key: "edge", label: "Edge" },
  { key: "value", label: "Value" }
] as const;

const DIM_KEYS = DIMS.map((d) => d.key);
const MAX_PER = 20;

export interface ScoreResult {
  scores: number[];
  reasons: string[];
  changeReasons?: (string | null)[];
}

interface IdeaScoreBarProps {
  blueprint?: BlueprintVersion;
  previousBlueprint?: BlueprintVersion | null;
  scoreCache: Record<string, ScoreResult>;
  onScoresLoaded: (blueprintId: string, result: ScoreResult) => void;
}

export function IdeaScoreBar({
  blueprint,
  previousBlueprint,
  scoreCache,
  onScoresLoaded
}: IdeaScoreBarProps) {
  const [localResult, setLocalResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDimIndex, setSelectedDimIndex] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!blueprint?.content) {
      setLocalResult(null);
      setLoading(false);
      return;
    }
    const id = blueprint.id;
    const cached = scoreCache[id];
    if (cached?.scores?.length === 5) {
      setLocalResult(cached);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLocalResult(null);
    fetch("/api/score-blueprint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blueprintContent: blueprint.content,
        previousBlueprintContent: previousBlueprint?.content?.trim() || undefined
      })
    })
      .then((r) => r.json())
      .then((json: { ok: boolean; data?: Record<string, unknown> }) => {
        if (cancelled || !json.ok || !json.data) return;
        const data = json.data as Record<string, unknown>;
        const scores = DIM_KEYS.map((k) =>
          Math.min(
            MAX_PER,
            Math.max(0, Math.round(Number(data[k]) ?? 0))
          )
        );
        const reasonsObj = (data.reasons as Record<string, string>) ?? {};
        const reasons = DIM_KEYS.map((k) => String(reasonsObj[k] ?? "").trim().slice(0, 300));
        const changeObj = data.changeReasons as Record<string, string> | undefined;
        const changeReasons = changeObj
          ? DIM_KEYS.map((k) => {
              const v = changeObj[k];
              return v != null ? String(v).trim().slice(0, 300) : null;
            })
          : undefined;
        const result: ScoreResult = { scores, reasons, changeReasons };
        setLocalResult(result);
        onScoresLoaded(id, result);
      })
      .catch(() => {
        if (!cancelled) setLocalResult(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [blueprint?.id, blueprint?.content, previousBlueprint?.id, previousBlueprint?.content, scoreCache]);

  const scores = localResult?.scores ?? null;
  const reasons = localResult?.reasons ?? [];
  const changeReasons = localResult?.changeReasons;
  const total = scores ? scores.reduce((a, b) => a + b, 0) : null;

  return (
    <div className="flex-shrink-0 py-1.5 px-3 border-b border-gray-200 bg-gray-50/80 text-[11px] relative">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 min-h-8">
        {DIMS.map((d, i) => (
          <button
            key={d.key}
            type="button"
            onClick={() =>
              setSelectedDimIndex((prev) => (prev === i ? null : i))
            }
            className="text-gray-600 shrink-0 min-w-[5rem] text-left hover:text-foreground focus:outline-none focus:ring-0"
          >
            {d.label}
            <span className="ml-0.5 font-medium text-foreground tabular-nums">
              {loading && !scores ? "…" : scores ? `${scores[i]}/${MAX_PER}` : "—"}
            </span>
          </button>
        ))}
        <span className="ml-auto text-gray-600 shrink-0 min-w-[4rem]">
          Total
          <span className="ml-0.5 font-medium text-foreground tabular-nums">
            {loading && !scores ? "…" : total !== null ? `${total}/100` : "—"}
          </span>
        </span>
      </div>

      {selectedDimIndex !== null && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setSelectedDimIndex(null)}
          />
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Score detail"
            className="absolute left-3 right-3 top-full mt-0.5 z-20 rounded border border-gray-200 bg-white shadow-lg p-2.5 text-[11px] max-w-md"
          >
            <div className="font-medium text-foreground mb-1">
              {DIMS[selectedDimIndex].label}
            </div>
            {reasons[selectedDimIndex] ? (
              <p className="text-gray-700 mb-1.5">
                {reasons[selectedDimIndex]}
              </p>
            ) : (
              <p className="text-gray-500 italic mb-1.5">No reason provided.</p>
            )}
            {changeReasons?.[selectedDimIndex] != null &&
            changeReasons[selectedDimIndex] !== "" ? (
              <>
                <div className="text-gray-500 font-medium mb-0.5">
                  vs 上一版本
                </div>
                <p className="text-gray-600">
                  {changeReasons[selectedDimIndex]}
                </p>
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
