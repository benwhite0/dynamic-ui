"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/custom/theme-toggle";
import { cn } from "@/lib/utils";

// The two reports surfaces, as a segmented control: whichever one you're on,
// the other is a single click away and the active tab says which that is.
const TABS = [
  { href: "/reports", label: "Chat" },
  { href: "/reports/overview", label: "Overview" },
];

export function ReportsNav() {
  const pathname = usePathname();

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-sm font-medium text-foreground">
          AI Spend
        </Link>

        <nav className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition-colors",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <Link
          href="/"
          className="flex items-center gap-1 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Assistant
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
