"use client";

import { useEffect, useState } from "react";
import { TranslateClient } from "./translate/translate-client";
import type { MeData } from "./translate/page";

export default function HomePage() {
  const [me, setMe] = useState<MeData | null | "loading">("loading");

  useEffect(() => {
    fetch("/api/translate/me", { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.data) setMe(res.data);
        else setMe(null);
      })
      .catch(() => setMe(null));
  }, []);

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
      onMeChange={(data) => setMe(data)}
    />
  );
}
