"use client";

import { useState, useEffect } from "react";

export function GlobalSettingsPanel({
  settings,
  onSaved
}: {
  settings: { preferredWords: string[]; preferredEmojis: string[] };
  onSaved: () => void;
}) {
  const [words, setWords] = useState(settings.preferredWords.join(", "));
  const [emojis, setEmojis] = useState(settings.preferredEmojis.join(" "));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setWords(settings.preferredWords.join(", "));
    setEmojis(settings.preferredEmojis.join(" "));
  }, [settings]);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/translate/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredWords: words.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
          preferredEmojis: emojis.split(/\s+/).filter(Boolean)
        })
      });
      const data = await res.json();
      if (data.ok) {
        setMessage("Saved");
        onSaved();
      } else setMessage(data.error || "Failed");
    } catch {
      setMessage("Network error");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-md">
      <h2 className="text-sm font-semibold text-stone-800 mb-3">Global settings</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-stone-600 mb-1">Preferred words (comma-separated)</label>
          <input
            type="text"
            value={words}
            onChange={(e) => setWords(e.target.value)}
            placeholder="e.g. please, thanks, kindly"
            className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-600 mb-1">Preferred emojis (space-separated)</label>
          <input
            type="text"
            value={emojis}
            onChange={(e) => setEmojis(e.target.value)}
            placeholder="e.g. 👍 ✨"
            className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 rounded bg-stone-800 text-white text-sm hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {message && <span className="text-xs text-stone-500">{message}</span>}
        </div>
      </div>
    </div>
  );
}
