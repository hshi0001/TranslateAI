"use client";

import { useState } from "react";
import type { ApiResponse, BlueprintVersion } from "@/lib/types";

interface RefinementChatProps {
  currentBlueprint?: BlueprintVersion;
  onRefined: (version: BlueprintVersion) => void;
  newIdeaMode?: boolean;
  onNewIdeaCreated?: (version: BlueprintVersion) => void;
}

type ChatRole = "user" | "ai";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  versionLabel?: string;
}

export function RefinementChat({
  currentBlueprint,
  onRefined,
  newIdeaMode = false,
  onNewIdeaCreated
}: RefinementChatProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [feedback, setFeedback] = useState<{ red: string[]; blue: string[] } | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [appliedBlueIndexes, setAppliedBlueIndexes] = useState<Set<number>>(new Set());

  const buildAiSummary = (
    blueprintContent: string,
    fallbackLabel: string
  ): string => {
    const maxLen = 100;
    const truncate = (text: string) =>
      text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;

    const marker = "Changes in this version";
    const idx = blueprintContent.indexOf(marker);
    if (idx >= 0) {
      const after = blueprintContent.slice(idx + marker.length);
      const lines = after.split("\n").map((l) => l.trim());
      const nonEmpty = lines.filter(Boolean).slice(0, 3).join(" ");
      if (nonEmpty) {
        return truncate(nonEmpty);
      }
    }

    const head = blueprintContent.split("\n").slice(0, 4).join(" ");
    return truncate(head || fallbackLabel);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (newIdeaMode && onNewIdeaCreated) {
      if (!message.trim()) {
        setError("Describe the app you want to build.");
        setIsSubmitting(false);
        return;
      }
      try {
        const res = await fetch("/api/generate-blueprint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: message.trim() })
        });
        const json = (await res.json()) as ApiResponse<BlueprintVersion>;
        if (!json.ok || !json.data) {
          throw new Error(json.error || "Failed to generate blueprint.");
        }
        onNewIdeaCreated(json.data);
        setMessage("");
      } catch (err: any) {
        setError(err.message || "Something went wrong.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!currentBlueprint) {
      setError("You need a blueprint before refining.");
      setIsSubmitting(false);
      return;
    }
    if (!message.trim()) {
      setError("Describe how you want to refine the blueprint.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/refine-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentBlueprint,
          userInstruction: message
        })
      });

      const json = (await res.json()) as ApiResponse<BlueprintVersion>;
      if (!json.ok || !json.data) {
        throw new Error(json.error || "Failed to refine blueprint.");
      }

      const nextVersion = json.data;

      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: message.trim(),
          versionLabel: currentBlueprint.label || `v${currentBlueprint.version}`
        },
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: buildAiSummary(
            nextVersion.content,
            nextVersion.label || `v${nextVersion.version}`
          ),
          versionLabel: nextVersion.label || `v${nextVersion.version}`
        }
      ]);

      onRefined(nextVersion);
      setMessage("");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-shrink-0 h-7 px-2 flex items-center justify-between border-b border-gray-200 bg-gray-50/80">
        <span className="text-[11px] font-medium text-gray-600">
          {newIdeaMode ? "New idea" : "Refine"}
        </span>
        {!newIdeaMode && currentBlueprint && (
          <button
            type="button"
            onClick={async () => {
              setError(null);
              setFeedbackLoading(true);
              setFeedback(null);
              try {
                const res = await fetch("/api/red-blue-feedback", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    blueprintContent: currentBlueprint.content
                  })
                });
                const json = await res.json();
                if (json.ok && json.data) {
                  const d = json.data as { red?: unknown; blue?: unknown };
                  const red = Array.isArray(d.red) ? d.red.map((x) => String(x).trim()).filter(Boolean) : [];
                  const blue = Array.isArray(d.blue) ? d.blue.map((x) => String(x).trim()).filter(Boolean) : [];
                  setFeedback({ red, blue });
                  setAppliedBlueIndexes(new Set());
                } else setError("Failed to load feedback.");
              } catch {
                setError("Failed to load feedback.");
              } finally {
                setFeedbackLoading(false);
              }
            }}
            disabled={feedbackLoading}
            className="text-[10px] text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            {feedbackLoading ? "…" : "Red vs Blue"}
          </button>
        )}
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Clear all messages?")) setMessages([]);
            }}
            className="text-[10px] text-gray-500 hover:text-red-600"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto space-y-2 p-2">
        {feedback && (
          <div className="rounded border border-gray-200 bg-gray-50/80 p-2 space-y-2 text-[11px]">
            <div>
              <span className="font-medium text-red-700">Red</span>
              <ul className="mt-0.5 list-disc list-inside text-gray-700 space-y-0.5">
                {feedback.red.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-medium text-blue-700">Blue</span>
              <ul className="mt-0.5 space-y-1">
                {feedback.blue.map((p, i) => {
                  const applied = appliedBlueIndexes.has(i);
                  return (
                    <li key={i} className="flex items-start justify-between gap-2">
                      <span className={`flex-1 min-w-0 ${applied ? "text-gray-400" : "text-gray-700"}`}>{p}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!currentBlueprint || applied) return;
                          setError(null);
                          setIsSubmitting(true);
                          try {
                            const res = await fetch("/api/refine-blueprint", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                currentBlueprint,
                                userInstruction: p
                              })
                            });
                            const json = (await res.json()) as ApiResponse<BlueprintVersion>;
                            if (!json.ok || !json.data) throw new Error(json.error || "Apply failed.");
                            const next = json.data;
                            setMessages((prev) => [
                              ...prev,
                              { id: `user-${Date.now()}`, role: "user", content: p, versionLabel: currentBlueprint.label || `v${currentBlueprint.version}` },
                              { id: `ai-${Date.now()}`, role: "ai", content: buildAiSummary(next.content, next.label || `v${next.version}`), versionLabel: next.label || `v${next.version}` }
                            ]);
                            onRefined(next);
                            setAppliedBlueIndexes((prev) => new Set(prev).add(i));
                          } catch (err: any) {
                            setError(err.message || "Apply failed.");
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={isSubmitting || applied}
                        className="shrink-0 px-1.5 py-0.5 text-[10px] bg-foreground text-white hover:opacity-90 disabled:opacity-50 min-w-[3.5rem]"
                      >
                        {applied ? "Applied" : "Apply"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-full text-xs flex items-start gap-1 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={[
                "inline-block max-w-full px-2 py-1.5 whitespace-pre-wrap text-[11px] border flex-1 min-w-0",
                msg.role === "user"
                  ? "bg-foreground text-white border-foreground"
                  : "bg-white text-foreground border-gray-200"
              ].join(" ")}
            >
              {msg.content}
              {msg.versionLabel && (
                <span className="ml-2 text-[9px] opacity-70">
                  ({msg.versionLabel})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMessages((prev) => prev.filter((m) => m.id !== msg.id))}
              className="shrink-0 p-0.5 text-gray-400 hover:text-red-500 text-[10px]"
              title="Delete"
            >
              ×
            </button>
          </div>
        ))}

        {!messages.length && null}
      </div>

      <form onSubmit={handleSubmit} className="flex-shrink-0 flex flex-col gap-2 p-2 border-t border-gray-200">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={newIdeaMode ? "Describe the app you want to build..." : "Refinement instruction..."}
          className="min-h-[72px] resize-y border border-gray-200 px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
        />
        {error && <p className="text-[11px] text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-3 py-1.5 bg-foreground text-white text-[11px] hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "..." : newIdeaMode ? "Generate Blueprint" : "Refine"}
          </button>
        </div>
      </form>
    </div>
  );
}

