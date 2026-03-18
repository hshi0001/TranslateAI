"use client";

import { useState, useEffect, useRef } from "react";
import type { MeData } from "./page";

const TARGET_LANGUAGES = [
  { value: "English", short: "ENG" },
  { value: "Chinese", short: "中文" },
  { value: "Japanese", short: "日" },
  { value: "Korean", short: "한" },
  { value: "Spanish", short: "ES" },
  { value: "French", short: "FR" },
  { value: "German", short: "DE" },
  { value: "Portuguese", short: "PT" },
  { value: "Russian", short: "RU" },
  { value: "Arabic", short: "AR" },
];

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  parentId?: string;
}

export function TranslatePanel({
  me,
  activeRoleId,
  onLearnRecorded
}: {
  me: MeData;
  activeRoleId: string | null;
  onLearnRecorded: () => void;
}) {
  const [messagesByRole, setMessagesByRole] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState("");
  const [targetLang, setTargetLang] = useState("English");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refineInstructionByMsg, setRefineInstructionByMsg] = useState<Record<string, string>>({});
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [copyDoneId, setCopyDoneId] = useState<string | null>(null);
  const [learnedIds, setLearnedIds] = useState<Set<string>>(new Set());
  const listEndRef = useRef<HTMLDivElement>(null);

  const effectiveRoleId =
    activeRoleId && activeRoleId !== "_other" && me.roles.some((r) => r.id === activeRoleId)
      ? activeRoleId
      : null;

  // Use activeRoleId for conversation key so preset-role chat stays visible even if me.roles was refreshed from another instance (e.g. Vercel).
  const currentRoleKey =
    activeRoleId === "_other" ? "_other" : (activeRoleId || "_default");
  const messages = messagesByRole[currentRoleKey] ?? [];

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const runSubmit = async () => {
    const text = input.trim();
    if (!text) return;
    setError("");
    setLoading(true);
    const userPlaceholder: ChatMessage = {
      id: "pending-user",
      role: "user",
      content: text,
      createdAt: new Date().toISOString()
    };
    setMessagesByRole((prev) => {
      const list = (prev[currentRoleKey] ?? []).concat(userPlaceholder);
      return { ...prev, [currentRoleKey]: list };
    });
    setInput("");
    try {
      const res = await fetch("/api/translate/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          targetLang,
          roleId: effectiveRoleId || undefined
        })
      });
      const data = await res.json();
      if (data.ok) {
        setMessagesByRole((prev) => {
          const list = (prev[currentRoleKey] ?? []).filter((m) => m.id !== "pending-user");
          const next = list.concat([data.data.userMessage, data.data.assistantMessage]);
          return { ...prev, [currentRoleKey]: next };
        });
        onLearnRecorded();
      } else {
        setMessagesByRole((prev) => {
          const list = (prev[currentRoleKey] ?? []).filter((m) => m.id !== "pending-user");
          return { ...prev, [currentRoleKey]: list };
        });
        setError(data.error || "Request failed");
        setInput(text);
      }
    } catch {
      setMessagesByRole((prev) => {
        const list = (prev[currentRoleKey] ?? []).filter((m) => m.id !== "pending-user");
        return { ...prev, [currentRoleKey]: list };
      });
      setError("Network error");
      setInput(text);
    }
    setLoading(false);
  };

  const runRefine = async (assistantContent: string, assistantId: string) => {
    setError("");
    setRefiningId(assistantId);
    const instruction = (refineInstructionByMsg[assistantId] ?? "").trim() || "Improve clarity and tone, keep meaning.";
    try {
      const res = await fetch("/api/translate/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: assistantContent,
          instruction,
          roleId: effectiveRoleId || undefined
        })
      });
      const data = await res.json();
      if (data.ok) {
        const { userMessage, assistantMessage } = data.data;
        const childUser: ChatMessage = {
          ...userMessage,
          parentId: assistantId
        };
        const childAssistant: ChatMessage = {
          ...assistantMessage,
          parentId: assistantId
        };
        setMessagesByRole((prev) => {
          const list = (prev[currentRoleKey] ?? []).concat([childUser, childAssistant]);
          return { ...prev, [currentRoleKey]: list };
        });
        setRefineInstructionByMsg((prev) => ({ ...prev, [assistantId]: "" }));
        onLearnRecorded();
      } else setError(data.error || "Refine failed");
    } catch {
      setError("Network error");
    }
    setRefiningId(null);
  };

  const copyAndLearn = async (content: string, originalForLearning: string, msgId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyDoneId(msgId);
      setTimeout(() => setCopyDoneId(null), 2000);
    } catch {}
  };

  const learnRefine = async (originalForLearning: string, content: string, msgId: string) => {
    if (!effectiveRoleId) return;
    await fetch("/api/translate/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleId: effectiveRoleId,
        original: originalForLearning,
        translated: content,
        action: "refine",
        refined: content
      })
    });
    onLearnRecorded();
    setLearnedIds((prev) => new Set([...prev, msgId]));
    setRefineInstructionByMsg((prev) => ({}));
  };

  function getRootOriginal(msgs: ChatMessage[], assistantIndex: number): string {
    for (let i = assistantIndex - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        if (!msgs[i].content.startsWith("Refine:")) return msgs[i].content;
        i--;
      }
    }
    return "";
  }

  function getOriginalForMessage(msg: ChatMessage, msgs: ChatMessage[], rootIndex?: number): string {
    if (msg.parentId) {
      const parent = msgs.find((x) => x.id === msg.parentId);
      return parent?.content ?? "";
    }
    return rootIndex !== undefined ? getRootOriginal(msgs, rootIndex) : "";
  }

  function renderRefineChildren(parentId: string) {
    const direct = messages.filter((c) => c.parentId === parentId);
    if (direct.length === 0) return null;
    return (
      <div className="ml-8 space-y-2 mt-2">
        {direct.map((c) => (
          <div key={c.id} className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl rounded-bl-md px-3 py-2 text-xs bg-white border border-stone-200 text-stone-700 shadow-sm leading-relaxed">
              <div className="whitespace-pre-wrap break-words">{c.content}</div>
              <div className="text-[10px] opacity-60 mt-1.5">{formatTime(c.createdAt)}</div>
              {c.role === "assistant" && (
                <>
                  <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() =>
                        copyAndLearn(c.content, getOriginalForMessage(c, messages), c.id)
                      }
                      className="text-xs text-stone-500 hover:text-stone-700"
                    >
                      {copyDoneId === c.id ? "Copied" : "Copy"}
                    </button>
                    <input
                      type="text"
                      value={refineInstructionByMsg[c.id] ?? ""}
                      onChange={(e) =>
                        setRefineInstructionByMsg((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      placeholder="Refine..."
                      className="w-32 px-2 py-1.5 border border-stone-200 rounded-lg text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") runRefine(c.content, c.id);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => runRefine(c.content, c.id)}
                      disabled={refiningId === c.id}
                      className="text-xs text-stone-600 hover:underline disabled:opacity-50"
                    >
                      {refiningId === c.id ? "..." : "Refine"}
                    </button>
                    {effectiveRoleId && (
                      <button
                        type="button"
                        onClick={() =>
                          learnRefine(getOriginalForMessage(c, messages), c.content, c.id)
                        }
                        className="text-xs text-stone-600 hover:underline"
                      >
                        {learnedIds.has(c.id) ? "Learned" : "Learn"}
                      </button>
                    )}
                  </div>
                  {renderRefineChildren(c.id)}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    return sameDay
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function deleteThread(rootId: string) {
    setMessagesByRole((prev) => {
      const list = (prev[currentRoleKey] ?? []).filter(
        (m) => m.id !== rootId && m.parentId !== rootId
      );
      return { ...prev, [currentRoleKey]: list };
    });
  }

  return (
    <div className="flex flex-col h-full min-h-0 w-full font-sans antialiased text-stone-800">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="space-y-6">
            {messages.length === 0 && !loading && !error && (
              <div className="text-center py-16 text-stone-500">
                <p className="text-sm leading-relaxed">Start a new conversation or select one from the sidebar.</p>
                <p className="text-xs mt-2 leading-relaxed">Send a message below to translate or refine.</p>
              </div>
            )}
            {messages
              .filter((m) => !m.parentId)
              .map((m, idx) => {
                const isAssistant = m.role === "assistant";
                return (
                  <div key={m.id} className="space-y-2">
                    <div
                      className={`flex ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                          m.role === "user"
                            ? "bg-stone-800 text-white rounded-br-md"
                            : "bg-white border border-stone-200 text-stone-800 rounded-bl-md shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="whitespace-pre-wrap break-words flex-1 min-w-0 leading-relaxed">{m.content}</div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] opacity-70" title={new Date(m.createdAt).toLocaleString()}>
                              {formatTime(m.createdAt)}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteThread(m.id)}
                              className="text-[10px] opacity-60 hover:opacity-100 hover:text-red-600"
                              title="Delete"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        {isAssistant && (
                          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-stone-100">
                            <button
                              type="button"
                              onClick={() =>
                                copyAndLearn(m.content, getOriginalForMessage(m, messages, idx), m.id)
                              }
                              className="text-xs text-stone-500 hover:text-stone-700"
                            >
                              {copyDoneId === m.id ? "Copied" : "Copy"}
                            </button>
                            <input
                              type="text"
                              value={refineInstructionByMsg[m.id] ?? ""}
                              onChange={(e) =>
                                setRefineInstructionByMsg((prev) => ({ ...prev, [m.id]: e.target.value }))
                              }
                              placeholder="Refine..."
                              className="w-32 px-2 py-1.5 border border-stone-200 rounded-lg text-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") runRefine(m.content, m.id);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => runRefine(m.content, m.id)}
                              disabled={refiningId === m.id}
                              className="text-xs text-stone-600 hover:underline disabled:opacity-50"
                            >
                              {refiningId === m.id ? "..." : "Refine"}
                            </button>
                            {effectiveRoleId && (
                              <button
                                type="button"
                                onClick={() =>
                                  learnRefine(getOriginalForMessage(m, messages, idx), m.content, m.id)
                                }
                                className="text-xs text-stone-600 hover:underline"
                              >
                                {learnedIds.has(m.id) ? "Learned" : "Learn"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {renderRefineChildren(m.id)}
                  </div>
                );
              })}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-white border border-stone-200 text-stone-500 text-sm">
                  ...
                </div>
              </div>
            )}
          </div>
          <div ref={listEndRef} />
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-stone-200 bg-white py-4">
        <div className="max-w-4xl mx-auto px-4">
          {error && (
            <p className="text-red-600 text-xs mb-2">
              {error}
            </p>
          )}
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message to translate..."
                rows={3}
                className="w-full px-4 py-3 pr-20 pb-10 border border-stone-300 rounded-2xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent resize-none placeholder:text-stone-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    runSubmit();
                  }
                }}
              />
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="absolute right-4 bottom-4 appearance-none bg-transparent border-0 text-[13px] text-blue-600 hover:text-blue-700 cursor-pointer py-0.5 pr-0 font-medium focus:outline-none focus:ring-0 underline decoration-blue-600/60 hover:decoration-blue-700"
                title="Target language"
              >
                {TARGET_LANGUAGES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.short}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={runSubmit}
              disabled={loading || !input.trim()}
              className="px-5 py-3 rounded-xl bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 disabled:opacity-50 flex-shrink-0"
            >
              {loading ? "..." : "Translate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
