"use client";

import type { BlueprintVersion } from "@/lib/types";

interface VersionHistoryProps {
  versions: BlueprintVersion[];
  currentId?: string;
  onSelect: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
}

export function VersionHistory({
  versions,
  currentId,
  onSelect,
  onRename,
  onDelete
}: VersionHistoryProps) {
  if (!versions.length) return null;

  return (
    <div className="flex items-center gap-0.5">
      {versions.map((v) => {
        const isActive = v.id === currentId;
        const label = v.label || `v${v.version}`;
        return (
          <div key={v.id} className="inline-flex items-center">
            <button
              type="button"
              onClick={() => onSelect(v.id)}
              className={[
                "px-2 py-1 text-[11px] border-b-2 -mb-px",
                isActive
                  ? "border-foreground text-foreground font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              ].join(" ")}
            >
              {label}
            </button>
            {isActive && onRename && (
              <button
                type="button"
                onClick={() => {
                  const next = window.prompt("Rename", v.label || `v${v.version}`);
                  if (next?.trim()) onRename(v.id, next.trim());
                }}
                className="ml-0.5 text-[10px] text-gray-400 hover:text-gray-600"
                title="Rename"
              >
                ✎
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (versions.length <= 1) return;
                  if (window.confirm(`Delete ${label}?`)) onDelete(v.id);
                }}
                disabled={versions.length <= 1}
                className="ml-0.5 text-[10px] text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:pointer-events-none"
                title={versions.length <= 1 ? "Keep at least one version" : "Delete version"}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

