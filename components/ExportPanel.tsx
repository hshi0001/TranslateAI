"use client";

import { useState } from "react";
import type { ApiResponse } from "@/lib/types";

interface ExportPanelProps {
  blueprintContent?: string;
}

interface BuildPack {
  readme: string;
  architecture: string;
  roadmap: string;
  cursorPrompts: string;
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

export function ExportPanel({ blueprintContent }: ExportPanelProps) {
  const [pack, setPack] = useState<BuildPack | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!blueprintContent) {
      setError("You need a final blueprint before exporting.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/export-build-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentBlueprint: blueprintContent })
      });

      const json = (await res.json()) as ApiResponse<BuildPack>;
      if (!json.ok || !json.data) {
        throw new Error(json.error || "Failed to generate build pack.");
      }

      setPack(json.data);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (key: keyof BuildPack | "all") => {
    if (!pack) return;
    const value =
      key === "all"
        ? [
            "# README.md",
            "",
            pack.readme,
            "",
            "# architecture.md",
            "",
            pack.architecture,
            "",
            "# roadmap.md",
            "",
            pack.roadmap,
            "",
            "# cursor_prompts.md",
            "",
            pack.cursorPrompts
          ].join("\n")
        : pack[key];

    await copyToClipboard(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-gray-800">Export</span>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading}
          className="px-3 py-1.5 bg-foreground text-white text-[11px] hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? "..." : "Generate"}
        </button>
      </header>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-1.5">
          {error}
        </p>
      )}

      {pack && (
        <div className="grid md:grid-cols-2 gap-3 text-[12px]">
          <section className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-gray-800">README.md</h2>
              <button
                type="button"
                onClick={() => handleCopy("readme")}
                className="text-[11px] text-gray-600 hover:text-gray-900"
              >
                {copied === "readme" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="border border-gray-200 px-2 py-1.5 whitespace-pre-wrap leading-relaxed bg-white font-mono">
              {pack.readme}
            </pre>
          </section>

          <section className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-gray-800">architecture.md</h2>
              <button type="button" onClick={() => handleCopy("architecture")} className="text-[11px] text-gray-600 hover:text-gray-900">
                {copied === "architecture" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="border border-gray-200 px-2 py-1.5 whitespace-pre-wrap leading-relaxed bg-white font-mono">{pack.architecture}</pre>
          </section>
          <section className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-gray-800">roadmap.md</h2>
              <button type="button" onClick={() => handleCopy("roadmap")} className="text-[11px] text-gray-600 hover:text-gray-900">
                {copied === "roadmap" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="border border-gray-200 px-2 py-1.5 whitespace-pre-wrap leading-relaxed bg-white font-mono">{pack.roadmap}</pre>
          </section>
          <section className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-gray-800">cursor_prompts.md</h2>
              <button type="button" onClick={() => handleCopy("cursorPrompts")} className="text-[11px] text-gray-600 hover:text-gray-900">
                {copied === "cursorPrompts" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="border border-gray-200 px-2 py-1.5 whitespace-pre-wrap leading-relaxed bg-white font-mono">{pack.cursorPrompts}</pre>
          </section>
        </div>
      )}

      {pack && (
        <div className="border-t border-gray-200 pt-2 flex justify-end">
          <button type="button" onClick={() => handleCopy("all")} className="px-3 py-1.5 bg-foreground text-white text-[11px] hover:opacity-90">
            {copied === "all" ? "Copied" : "Copy all"}
          </button>
        </div>
      )}
    </div>
  );
}

