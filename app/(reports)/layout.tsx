import { Metadata } from "next";
import Link from "next/link";

import { ThemeToggle } from "@/components/custom/theme-toggle";

export const metadata: Metadata = {
  title: "AI Spend Reports",
  description: "Dynamically generated charts for AI model spend.",
};

export default function ReportsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-medium text-foreground">AI Spend</span>
        <nav className="flex items-center gap-4 text-xs text-muted-foreground">
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
