import { Metadata } from "next";
import Link from "next/link";

import { ThemeToggle } from "@/components/custom/theme-toggle";

export const metadata: Metadata = {
  title: "AI Spend Reports",
  description: "Ask about AI model spend and get charts back.",
};

export default function ReportsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Fixed viewport height with the chat scrolling inside it, so the composer
    // stays put instead of being pushed down the page by a long conversation.
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <Link href="/reports" className="text-sm font-medium text-foreground">
          AI Spend
        </Link>
        <nav className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link
            href="/reports/overview"
            className="transition-colors hover:text-foreground"
          >
            Overview
          </Link>
          <Link href="/" className="transition-colors hover:text-foreground">
            Chat
          </Link>
          <ThemeToggle />
        </nav>
      </header>
      {children}
    </div>
  );
}
