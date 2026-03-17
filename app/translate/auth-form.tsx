"use client";

import { useState } from "react";
import type { MeData } from "./page";

export function AuthForm({ onSuccess }: { onSuccess: (data: MeData) => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const url = tab === "login" ? "/api/translate/auth/login" : "/api/translate/auth/register";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Request failed");
        setLoading(false);
        return;
      }
      const meRes = await fetch("/api/translate/me");
      const meData = await meRes.json();
      if (meData.ok && meData.data) onSuccess(meData.data);
      else setError("Failed to load session");
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex rounded-md border border-stone-200 p-0.5 mb-5">
        <button
          type="button"
          onClick={() => setTab("login")}
          className={`flex-1 py-2 text-sm font-medium rounded ${tab === "login" ? "bg-stone-800 text-white" : "text-stone-600"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setTab("register")}
          className={`flex-1 py-2 text-sm font-medium rounded ${tab === "register" ? "bg-stone-800 text-white" : "text-stone-600"}`}
        >
          Register
        </button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
          required
        />
        <input
          type="password"
          placeholder="Password (min 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
          required
          minLength={6}
        />
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 disabled:opacity-50"
        >
          {loading ? "..." : tab === "login" ? "Sign in" : "Register"}
        </button>
      </form>
    </div>
  );
}
