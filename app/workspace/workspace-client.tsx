"use client";

import { useEffect, useState } from "react";
import type { BlueprintVersion, Idea } from "@/lib/types";
import { BlueprintPanel } from "@/components/BlueprintPanel";
import { IdeaScoreBar, type ScoreResult } from "@/components/IdeaScoreBar";
import { RefinementChat } from "@/components/RefinementChat";
import { VersionHistory } from "@/components/VersionHistory";
import { IdeaManager } from "@/components/IdeaManager";
import Link from "next/link";

const STORAGE_KEY = "blueprint-ai:ideas";

export function WorkspaceClient() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [currentIdeaId, setCurrentIdeaId] = useState<string | undefined>();
  const [collapsedIdeas, setCollapsedIdeas] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const [newIdeaMode, setNewIdeaMode] = useState(false);
  const [scoreCache, setScoreCache] = useState<Record<string, ScoreResult>>({});

  const currentIdea = ideas.find((i) => i.id === currentIdeaId) ?? ideas[0];
  const versions: BlueprintVersion[] = currentIdea?.versions ?? [];
  const current: BlueprintVersion | undefined =
    versions.find((v) => v.id === selectedVersionId) ??
    versions[versions.length - 1] ??
    undefined;
  const currentVersionIndex = current
    ? versions.findIndex((v) => v.id === current.id)
    : -1;
  const previousVersion =
    currentVersionIndex > 0 ? versions[currentVersionIndex - 1] : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Backwards compatibility: migrate from single-version storage if present
      const legacyRaw = window.sessionStorage.getItem("blueprint-ai:versions");
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw) as BlueprintVersion[];
        if (legacy.length) {
          const now = new Date().toISOString();
          const idea: Idea = {
            id: "idea-1",
            label: "Idea 1",
            createdAt: now,
            updatedAt: now,
            versions: legacy
          };
          setIdeas([idea]);
          setCurrentIdeaId(idea.id);
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([idea]));
        }
      }
      return;
    }
    const parsed = JSON.parse(raw) as Idea[];
    setIdeas(parsed);
    const lastIdea = parsed[parsed.length - 1];
    setCurrentIdeaId(lastIdea?.id);
    const lastVersionId =
      lastIdea?.versions[lastIdea.versions.length - 1]?.id;
    setSelectedVersionId(lastVersionId);
  }, []);

  const handleRefined = (v: BlueprintVersion) => {
    setIdeas((prev) => {
      if (!currentIdea) return prev;
      const next = prev.map((idea) =>
        idea.id === currentIdea.id
          ? {
              ...idea,
              updatedAt: v.updatedAt,
              versions: [...idea.versions, v]
            }
          : idea
      );
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
    setSelectedVersionId(v.id);
  };

  const handleSelectVersion = (id: string) => {
    const found = versions.find((v) => v.id === id);
    if (found) {
      setSelectedVersionId(found.id);
    }
  };

  const handleSelectIdea = (id: string) => {
    setCurrentIdeaId(id);
    const idea = ideas.find((i) => i.id === id);
    const lastVersionId =
      idea?.versions[idea.versions.length - 1]?.id ?? undefined;
    setSelectedVersionId(lastVersionId);
  };

  const handleCreateIdea = () => {
    setNewIdeaMode(true);
  };

  const handleNewIdeaCreated = (blueprint: BlueprintVersion) => {
    const now = new Date().toISOString();
    const nextIndex = ideas.length + 1;
    const newIdea: Idea = {
      id: `idea-${nextIndex}`,
      label: `Idea ${nextIndex}`,
      createdAt: now,
      updatedAt: now,
      versions: [blueprint]
    };
    const next = [...ideas, newIdea];
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    setIdeas(next);
    setCurrentIdeaId(newIdea.id);
    setSelectedVersionId(blueprint.id);
    setNewIdeaMode(false);
  };

  const handleRenameIdea = (id: string, name: string) => {
    setIdeas((prev) => {
      const next = prev.map((idea) =>
        idea.id === id ? { ...idea, label: name, updatedAt: new Date().toISOString() } : idea
      );
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleDeleteIdea = (id: string) => {
    setIdeas((prev) => {
      const next = prev.filter((idea) => idea.id !== id);
      let nextCurrentId = currentIdeaId;
      if (id === currentIdeaId) {
        nextCurrentId = next.length ? next[next.length - 1].id : undefined;
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      setCurrentIdeaId(nextCurrentId);
      const nextIdea = next.find((i) => i.id === nextCurrentId);
      const lastVersionId =
        nextIdea?.versions[nextIdea.versions.length - 1]?.id ?? undefined;
      setSelectedVersionId(lastVersionId);
      return next;
    });
  };

  const handleRenameVersion = (id: string, name: string) => {
    setIdeas((prev) => {
      if (!currentIdea) return prev;
      const next = prev.map((idea) =>
        idea.id === currentIdea.id
          ? {
              ...idea,
              versions: idea.versions.map((v) =>
                v.id === id ? { ...v, label: name } : v
              )
            }
          : idea
      );
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleDeleteVersion = (versionId: string) => {
    if (!currentIdea || currentIdea.versions.length <= 1) return;
    setIdeas((prev) => {
      if (!currentIdea) return prev;
      const nextVersions = currentIdea.versions.filter((v) => v.id !== versionId);
      const next = prev.map((idea) =>
        idea.id === currentIdea.id ? { ...idea, versions: nextVersions } : idea
      );
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
    setScoreCache((prev) => {
      const next = { ...prev };
      delete next[versionId];
      return next;
    });
    if (selectedVersionId === versionId) {
      const remaining = currentIdea.versions.filter((v) => v.id !== versionId);
      setSelectedVersionId(remaining.length ? remaining[remaining.length - 1].id : undefined);
    }
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <IdeaManager
        ideas={ideas}
        currentId={currentIdea?.id}
        onSelect={handleSelectIdea}
        onRename={handleRenameIdea}
        onDelete={handleDeleteIdea}
        onCreateNew={handleCreateIdea}
        collapsed={collapsedIdeas}
        onToggleCollapsed={() => setCollapsedIdeas((v) => !v)}
      />
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <div className="h-8 flex items-center justify-between px-2 border-b border-gray-200 bg-gray-50/80">
          <VersionHistory
            versions={versions}
            currentId={current?.id}
            onSelect={handleSelectVersion}
            onRename={handleRenameVersion}
            onDelete={handleDeleteVersion}
          />
          <div className="flex items-center gap-2 text-[11px]">
            <Link href="/export" className="text-gray-600 hover:text-gray-900">
              Export
            </Link>
          </div>
        </div>
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="flex-1 min-w-0 min-h-0 border-r border-gray-200 flex flex-col overflow-hidden">
            <IdeaScoreBar
              blueprint={current}
              previousBlueprint={previousVersion}
              scoreCache={scoreCache}
              onScoresLoaded={(id, result) =>
                setScoreCache((prev) => ({ ...prev, [id]: result }))
              }
            />
            <BlueprintPanel blueprint={current} />
          </div>
          <div className="flex-1 min-w-0 min-h-0 flex flex-col max-w-[50%]">
            <RefinementChat
              currentBlueprint={current}
              onRefined={handleRefined}
              newIdeaMode={newIdeaMode}
              onNewIdeaCreated={handleNewIdeaCreated}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

