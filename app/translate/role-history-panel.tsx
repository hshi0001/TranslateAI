"use client";

import { useState, useEffect } from "react";

export interface RoleHistoryRecord {
  id: string;
  original: string;
  result: string;
  mode: "translate" | "refine";
  createdAt: string;
}

export function RoleHistoryPanel({
  roleId,
  roleName,
  onBack
}: {
  roleId: string;
  roleName: string;
  onBack: () => void;
}) {
  const [records, setRecords] = useState<RoleHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/translate/roles/${roleId}/history`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.data) setRecords(res.data);
        else setRecords([]);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [roleId]);

  const preview = (text: string, max = 60) =>
    text.length <= max ? text : text.slice(0, max) + "…";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-stone-200 bg-white">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          ← Back
        </button>
        <h2 className="text-sm font-semibold text-stone-800">
          {roleName} — all records ({records.length})
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <p className="text-sm text-stone-500">Loading...</p>
        )}
        {!loading && records.length === 0 && (
          <p className="text-sm text-stone-500">No history for this role yet.</p>
        )}
        {!loading && records.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-3">
            {records.map((r) => {
              const isExpanded = expandedId === r.id;
              return (
                <div
                  key={r.id}
                  className="border border-stone-200 rounded-lg bg-white overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-stone-50"
                  >
                    <span className="text-xs text-stone-400 flex-shrink-0">
                      {new Date(r.createdAt).toLocaleString()} · {r.mode}
                    </span>
                    <span className="text-sm text-stone-600 truncate flex-1">
                      {preview(r.original)}
                    </span>
                    <span className="text-stone-400 flex-shrink-0">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-stone-100 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-stone-500 mb-1">Original</p>
                        <div className="text-sm text-stone-800 whitespace-pre-wrap break-words bg-stone-50 rounded p-3">
                          {r.original}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-stone-500 mb-1">Result</p>
                        <div className="text-sm text-stone-800 whitespace-pre-wrap break-words bg-stone-50 rounded p-3">
                          {r.result}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
