"use client";

import { useEffect, useState } from "react";
import type { BlueprintVersion, Idea } from "@/lib/types";
import { ExportPanel } from "@/components/ExportPanel";
import Link from "next/link";

const STORAGE_KEY = "blueprint-ai:ideas";

export function ExportClient() {
  const [latest, setLatest] = useState<BlueprintVersion | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacyRaw = window.sessionStorage.getItem("blueprint-ai:versions");
      if (!legacyRaw) return;
      const legacy = JSON.parse(legacyRaw) as BlueprintVersion[];
      if (!legacy.length) return;
      setLatest(legacy[legacy.length - 1]);
      return;
    }
    const parsed = JSON.parse(raw) as Idea[];
    if (!parsed.length) return;
    const lastIdea = parsed[parsed.length - 1];
    const lastVersion =
      lastIdea.versions[lastIdea.versions.length - 1] ?? null;
    setLatest(lastVersion);
  }, []);

  return (
    <div className="container-page flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-gray-800">Export</span>
        <Link href="/workspace" className="text-[11px] text-gray-500 hover:text-gray-800">
          ← Workspace
        </Link>
      </div>
      <ExportPanel blueprintContent={latest?.content} />
    </div>
  );
}

