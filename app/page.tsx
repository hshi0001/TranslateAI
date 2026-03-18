"use client";

import { useEffect, useState } from "react";
import { TranslateClient } from "./translate/translate-client";
import type { MeData } from "./translate/page";

const ROLES_STORAGE_KEY = "translate-app-roles";

function loadSavedRoles(userId: string): MeData["roles"] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${ROLES_STORAGE_KEY}-${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MeData["roles"];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRoles(userId: string, roles: MeData["roles"]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${ROLES_STORAGE_KEY}-${userId}`, JSON.stringify(roles));
  } catch {}
}

function mergeRoles(server: MeData["roles"], saved: MeData["roles"]): MeData["roles"] {
  const byId = new Map(server.map((r) => [r.id, r]));
  for (const r of saved) {
    if (!byId.has(r.id)) byId.set(r.id, r);
  }
  return Array.from(byId.values());
}

export default function HomePage() {
  const [me, setMe] = useState<MeData | null | "loading">("loading");

  useEffect(() => {
    fetch("/api/translate/me", { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok || !res.data) {
          setMe(null);
          return;
        }
        const data = res.data as MeData;
        const saved = loadSavedRoles(data.user.id);
        const mergedRoles = mergeRoles(data.roles, saved);
        setMe({ ...data, roles: mergedRoles });
      })
      .catch(() => setMe(null));
  }, []);

  const handleMeChange = (data: MeData | null) => {
    setMe(data);
    if (data?.roles?.length) saveRoles(data.user.id, data.roles);
  };

  if (me === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-100">
        <span className="text-sm text-stone-500">Loading...</span>
      </div>
    );
  }

  return (
    <TranslateClient
      initialMe={me}
      onMeChange={handleMeChange}
    />
  );
}
