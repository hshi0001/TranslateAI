"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BlueprintVersion, ApiResponse, Idea } from "@/lib/types";

export default function IdeaInput() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) {
      setError("Please describe the app you want to build.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/generate-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea })
      });

      const json = (await res.json()) as ApiResponse<BlueprintVersion>;
      if (!json.ok || !json.data) {
        throw new Error(json.error || "Failed to generate blueprint.");
      }

      // Store in session storage for current session only
      if (typeof window !== "undefined") {
        const ideasKey = "blueprint-ai:ideas";
        const existing = window.sessionStorage.getItem(ideasKey);
        let ideas: Idea[] = existing ? JSON.parse(existing) : [];

        const now = new Date().toISOString();
        const nextIndex = ideas.length + 1;
        const newIdea: Idea = {
          id: `idea-${nextIndex}`,
          label: `Idea ${nextIndex}`,
          createdAt: now,
          updatedAt: now,
          versions: [json.data]
        };

        ideas = [...ideas, newIdea];
        window.sessionStorage.setItem(ideasKey, JSON.stringify(ideas));
      }

      router.push("/workspace");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto mt-12 flex flex-col gap-4"
    >
      <textarea
        id="idea"
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="Describe the app you want to build..."
        className="min-h-[240px] w-full resize-y border border-gray-200 px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white font-mono"
      />
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-foreground text-white text-[12px] hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "..." : "Generate Blueprint"}
        </button>
      </div>
    </form>
  );
}

