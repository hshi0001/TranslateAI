"use client";

import { usePathname } from "next/navigation";

export function HeaderSkipTranslate({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/" || pathname?.startsWith("/translate")) return null;
  return <>{children}</>;
}
