"use client";

import { useState } from "react";

type Role = { id: string; name: string; traits: string[]; learningCount?: number; historyCount?: number };

export function RolesPanel({
  roles,
  onSaved
}: {
  roles: Role[];
  onSaved: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newTraits, setNewTraits] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  const saveRole = async (id: string, name: string, traits: string[]) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/translate/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, traits })
      });
      if (res.ok) onSaved();
    } finally {
      setLoading(false);
      setEditingId(null);
    }
  };

  const addRole = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/translate/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          traits: newTraits.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
        })
      });
      if (res.ok) {
        onSaved();
        setNewName("");
        setNewTraits("");
        setShowAdd(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteRole = async (id: string) => {
    if (!confirm("Delete this role?")) return;
    const res = await fetch(`/api/translate/roles/${id}`, { method: "DELETE" });
    if (res.ok) onSaved();
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-sm font-semibold text-stone-800 mb-3">Role presets</h2>
      <p className="text-xs text-stone-500 mb-4">
        Add roles (e.g. Bob, Manager) and traits (polite, bullet points). Translation follows the selected role and learns from your Copy / Refine choices.
      </p>
      <div className="space-y-3">
        {roles.map((r) => (
          <div key={r.id} className="border border-stone-200 rounded p-3 bg-white">
            {editingId === r.id ? (
              <>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Role name"
                  className="w-full px-3 py-2 border rounded text-sm mb-2"
                />
                <input
                  type="text"
                  value={newTraits}
                  onChange={(e) => setNewTraits(e.target.value)}
                  placeholder="Traits, comma-separated"
                  className="w-full px-3 py-2 border rounded text-sm mb-2"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveRole(r.id, newName.trim(), newTraits.split(/[,，]/).map((s) => s.trim()).filter(Boolean))}
                    disabled={loading}
                    className="px-3 py-1.5 rounded bg-stone-800 text-white text-sm"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingId(null); setNewName(r.name); setNewTraits(r.traits.join(", ")); }}
                    className="px-3 py-1.5 rounded border border-stone-300 text-stone-700 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-800 text-sm">{r.name}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setEditingId(r.id); setNewName(r.name); setNewTraits(r.traits.join(", ")); }} className="text-xs text-stone-500 hover:underline">Edit</button>
                    <button type="button" onClick={() => deleteRole(r.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </div>
                </div>
                {(r.traits.length > 0 || (r.learningCount ?? 0) > 0 || (r.historyCount ?? 0) > 0) && (
                  <p className="text-xs text-stone-500 mt-1">
                    {r.traits.join(" · ")}
                    {(r.learningCount ?? 0) > 0 && (
                      <span className="ml-1">· <strong>{r.learningCount}</strong> style examples</span>
                    )}
                    {(r.historyCount ?? 0) > 0 && (
                      <span className="ml-1">· <strong>{r.historyCount}</strong> history records</span>
                    )}
                  </p>
                )}
              </>
            )}
          </div>
        ))}
        {showAdd ? (
          <div className="border border-dashed border-stone-300 rounded p-3 bg-stone-50">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Role name"
              className="w-full px-3 py-2 border rounded text-sm mb-2"
            />
            <input
              type="text"
              value={newTraits}
              onChange={(e) => setNewTraits(e.target.value)}
              placeholder="Traits: polite, bullet points, formal"
              className="w-full px-3 py-2 border rounded text-sm mb-2"
            />
            <div className="flex gap-2">
              <button type="button" onClick={addRole} disabled={loading || !newName.trim()} className="px-3 py-1.5 rounded bg-stone-800 text-white text-sm disabled:opacity-50">Add</button>
              <button type="button" onClick={() => { setShowAdd(false); setNewName(""); setNewTraits(""); }} className="px-3 py-1.5 rounded border border-stone-300 text-stone-700 text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="w-full py-2 border border-dashed border-stone-300 rounded text-stone-500 text-sm hover:bg-stone-50"
          >
            + Add role
          </button>
        )}
      </div>
    </div>
  );
}
