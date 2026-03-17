import type { Metadata } from "next";
import "./globals.css";
import { HeaderSkipTranslate } from "./header-skip-translate";

export const metadata: Metadata = {
  title: "Translate",
  description: "Translate and refine text with role-based style learning."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen bg-background text-foreground overflow-hidden">
        <div className="h-full flex flex-col min-h-0">
          <HeaderSkipTranslate>
            <header className="h-9 flex-shrink-0 border-b border-gray-200 bg-white flex items-center px-3">
              <span className="text-[13px] font-medium text-gray-800">Translate</span>
              <a href="/" className="ml-4 text-[12px] text-amber-600 hover:underline">App</a>
            </header>
          </HeaderSkipTranslate>
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}

