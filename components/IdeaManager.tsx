"use client";

import type { Idea } from "@/lib/types";

interface IdeaManagerProps {
  ideas: Idea[];
  currentId?: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function IdeaManager({
  ideas,
  currentId,
  onSelect,
  onRename,
  onDelete,
  onCreateNew,
  collapsed,
  onToggleCollapsed
}: IdeaManagerProps) {
  if (collapsed) {
    return (
      <aside className="w-9 flex flex-col items-center bg-white border-r border-gray-200 flex-shrink-0">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="mt-1 flex items-center justify-center h-7 w-7 text-gray-500 hover:bg-gray-100 text-[11px]"
          title="Ideas"
        >
          ›
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCreateNew}
          className="mb-1 flex items-center justify-center h-7 w-7 text-gray-500 hover:bg-gray-100 text-sm"
          title="New idea"
        >
          +
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-52 flex flex-col bg-white border-r border-gray-200 flex-shrink-0">
      <div className="h-8 flex items-center justify-between px-2 border-b border-gray-200 bg-gray-50/80">
        <span className="text-[11px] font-medium text-gray-600 uppercase tracking-wider">Ideas</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onCreateNew}
            className="flex items-center justify-center h-6 w-6 text-gray-500 hover:bg-gray-200 text-sm"
            title="New idea"
          >
            +
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex items-center justify-center h-6 w-6 text-[11px] text-gray-400 hover:text-gray-600"
          >
            ‹
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {ideas.map((idea, index) => {
          const active = idea.id === currentId;
          const latestVersion = idea.versions[idea.versions.length - 1]?.version ?? 1;
          return (
            <div
              key={idea.id}
              className={[
                "group flex items-center gap-1 px-2 py-1.5 text-[12px]",
                active ? "bg-gray-100 text-foreground" : "text-gray-700 hover:bg-gray-50"
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => onSelect(idea.id)}
                className="flex-1 text-left truncate min-w-0"
              >
                {idea.label || `Idea ${index + 1}`}
              </button>
              <span className="text-[10px] text-gray-400 flex-shrink-0">v{latestVersion}</span>
              <button
                type="button"
                onClick={() => {
                  const next = window.prompt("Rename", idea.label || `Idea ${index + 1}`);
                  if (next?.trim()) onRename(idea.id, next.trim());
                }}
                className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 hover:text-gray-600 flex-shrink-0"
                title="Rename"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete "${idea.label || `Idea ${index + 1}`}"?`)) onDelete(idea.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-600 flex-shrink-0"
                title="Delete"
              >
                ×
              </button>
            </div>
          );
        })}
        {!ideas.length && (
          <p className="px-2 py-2 text-[11px] text-gray-400">No ideas yet. Click + to add.</p>
        )}
      </div>
    </aside>
  );
}

