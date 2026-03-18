"use client";

import { useState, useEffect } from "react";

type UserWithLimits = {
  id: string;
  email: string;
  maxPerMessage: number;
  maxPerDay: number;
};

export function AdminPanel() {
  const [users, setUsers] = useState<UserWithLimits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMaxPerMessage, setEditMaxPerMessage] = useState("");
  const [editMaxPerDay, setEditMaxPerDay] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/translate/admin/users", { credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        setUsers(data.data ?? []);
      } else {
        setError(data.error || "Failed to load users");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const startEdit = (u: UserWithLimits) => {
    setEditingId(u.id);
    setEditMaxPerMessage(String(u.maxPerMessage));
    setEditMaxPerDay(String(u.maxPerDay));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveLimits = async () => {
    if (!editingId) return;
    const maxPerMessage = parseInt(editMaxPerMessage, 10);
    const maxPerDay = parseInt(editMaxPerDay, 10);
    if (isNaN(maxPerMessage) || maxPerMessage < 1 || maxPerMessage > 10000) {
      setError("单条字数限制请填写 1–10000");
      return;
    }
    if (isNaN(maxPerDay) || maxPerDay < 1 || maxPerDay > 1000000) {
      setError("每日字数限制请填写 1–1000000");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/translate/admin/users/${editingId}/limits`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPerMessage, maxPerDay })
      });
      const data = await res.json();
      if (data.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingId
              ? { ...u, maxPerMessage: data.data.maxPerMessage, maxPerDay: data.data.maxPerDay }
              : u
          )
        );
        setEditingId(null);
      } else {
        setError(data.error || "保存失败");
      }
    } catch {
      setError("Network error");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-stone-500">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-sm font-semibold text-stone-800 mb-3">用户字数限制</h2>
      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}
      <div className="border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">邮箱</th>
              <th className="text-left px-4 py-2 font-medium">单条上限</th>
              <th className="text-left px-4 py-2 font-medium">每日上限</th>
              <th className="text-left px-4 py-2 font-medium w-24">操作</th>
            </tr>
          </thead>
          <tbody className="text-stone-800">
            {users.map((u) => (
              <tr key={u.id} className="border-t border-stone-200">
                <td className="px-4 py-2">{u.email}</td>
                {editingId === u.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={1}
                        max={10000}
                        value={editMaxPerMessage}
                        onChange={(e) => setEditMaxPerMessage(e.target.value)}
                        className="w-20 px-2 py-1 border border-stone-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={1}
                        max={1000000}
                        value={editMaxPerDay}
                        onChange={(e) => setEditMaxPerDay(e.target.value)}
                        className="w-24 px-2 py-1 border border-stone-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={saveLimits}
                        disabled={saving}
                        className="text-blue-600 hover:underline disabled:opacity-50 mr-2"
                      >
                        {saving ? "..." : "保存"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-stone-500 hover:underline"
                      >
                        取消
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2">{u.maxPerMessage}</td>
                    <td className="px-4 py-2">{u.maxPerDay}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => startEdit(u)}
                        className="text-blue-600 hover:underline"
                      >
                        编辑
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && !loading && (
        <p className="text-sm text-stone-500 mt-3">暂无用户（需配置 DATABASE_URL）</p>
      )}
    </div>
  );
}
