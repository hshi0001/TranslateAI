"use client";

type Tab = "translate" | "settings" | "roles" | "admin";

type RoleItem = { id: string; name: string; traits: string[]; learningCount?: number; historyCount?: number };

export function Sidebar({
  currentTab,
  selectedRoleId,
  onTabChange,
  onSelectRole,
  roles,
  onLogout,
  isAdmin
}: {
  currentTab: Tab;
  selectedRoleId: string | null;
  onTabChange: (t: Tab) => void;
  onSelectRole: (roleId: string | null) => void;
  roles: RoleItem[];
  onLogout: () => void;
  isAdmin?: boolean;
}) {
  return (
    <aside className="w-60 flex-shrink-0 flex flex-col bg-stone-900 text-stone-200 border-r border-stone-700">
      <div className="flex-1 min-h-0 overflow-y-auto px-2">
        <div className="space-y-0.5">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRole(selectedRoleId === r.id ? null : r.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm truncate ${
                selectedRoleId === r.id ? "bg-stone-700 text-white" : "hover:bg-stone-800"
              }`}
            >
              {r.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onSelectRole(selectedRoleId === "_other" ? null : "_other")}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${
              selectedRoleId === "_other" ? "bg-stone-700 text-white" : "hover:bg-stone-800"
            }`}
          >
            Other
          </button>
        </div>
      </div>
      <div className="border-t border-stone-700 p-2 space-y-0.5">
        <button
          type="button"
          onClick={() => { onTabChange("roles"); onSelectRole(null); }}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-amber-400/90 hover:bg-stone-800"
        >
          + Add role
        </button>
        <button
          type="button"
          onClick={() => { onTabChange("settings"); onSelectRole(null); }}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm ${currentTab === "settings" ? "bg-stone-700 text-white" : "hover:bg-stone-800"}`}
        >
          Global settings
        </button>
        <button
          type="button"
          onClick={() => { onTabChange("roles"); onSelectRole(null); }}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm ${currentTab === "roles" ? "bg-stone-700 text-white" : "hover:bg-stone-800"}`}
        >
          Role presets
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => { onTabChange("admin"); onSelectRole(null); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${currentTab === "admin" ? "bg-stone-700 text-white" : "hover:bg-stone-800"}`}
          >
            Admin
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-stone-400 hover:bg-stone-800"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
