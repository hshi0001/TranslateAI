"use client";

import { useState } from "react";
import type { MeData } from "./page";
import { Sidebar } from "./sidebar";
import { GlobalSettingsPanel } from "./global-settings-panel";
import { RolesPanel } from "./roles-panel";
import { TranslatePanel } from "./translate-panel";

type Tab = "translate" | "settings" | "roles";

export function TranslateApp({
  me,
  onMeChange
}: {
  me: MeData;
  onMeChange: (data: MeData | null) => void;
}) {
  const [tab, setTab] = useState<Tab>("translate");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const refreshMe = async () => {
    const res = await fetch("/api/translate/me", { credentials: "include" });
    const data = await res.json();
    if (data.ok && data.data) onMeChange(data.data);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="h-12 flex-shrink-0 border-b border-stone-200 flex items-center px-4 gap-3">
        <button
          type="button"
          onClick={() => { setTab("translate"); setSelectedRoleId(null); }}
          className="text-sm font-semibold text-stone-800 hover:text-stone-600"
        >
          Translate
        </button>
        <span className="text-stone-300">|</span>
        <span className="text-xs text-stone-500">{me.user.email}</span>
      </header>
      <div className="flex-1 flex min-h-0">
        <Sidebar
          currentTab={tab}
          selectedRoleId={selectedRoleId}
          onTabChange={(t) => { setTab(t); setSelectedRoleId(null); }}
          onSelectRole={setSelectedRoleId}
          roles={me.roles}
          onLogout={async () => {
            await fetch("/api/translate/auth/logout", { method: "POST" });
            onMeChange(null);
          }}
        />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-stone-50">
          {tab === "translate" ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <TranslatePanel
                me={me}
                activeRoleId={selectedRoleId}
                onLearnRecorded={refreshMe}
              />
            </div>
          ) : tab === "settings" ? (
            <div className="flex-1 overflow-auto p-6">
              <GlobalSettingsPanel settings={me.settings} onSaved={refreshMe} />
            </div>
          ) : tab === "roles" ? (
            <div className="flex-1 overflow-auto p-6">
              <RolesPanel
                roles={me.roles}
                onSaved={refreshMe}
                onSelectRole={(id) => {
                  setTab("translate");
                  setSelectedRoleId(id);
                }}
              />
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
