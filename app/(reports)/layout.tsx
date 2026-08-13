import { Metadata } from "next";

import { ReportsNav } from "@/components/reports/reports-nav";

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
      <ReportsNav />
      {children}
    </div>
  );
}
