"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export interface MeData {
  user: { id: string; email: string };
  settings: { preferredWords: string[]; preferredEmojis: string[] };
  roles: { id: string; name: string; traits: string[]; learningCount?: number; historyCount?: number }[];
}

export default function TranslateRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return (
    <div className="h-screen flex items-center justify-center bg-stone-100">
      <span className="text-sm text-stone-500">Redirecting...</span>
    </div>
  );
}
