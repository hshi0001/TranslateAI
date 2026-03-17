"use client";

import type { MeData } from "./page";
import { AuthForm } from "./auth-form";
import { TranslateApp } from "./translate-app";

export function TranslateClient({
  initialMe,
  onMeChange
}: {
  initialMe: MeData | null;
  onMeChange: (data: MeData | null) => void;
}) {
  if (!initialMe) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <AuthForm onSuccess={(data) => onMeChange(data)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <TranslateApp me={initialMe} onMeChange={onMeChange} />
    </div>
  );
}
