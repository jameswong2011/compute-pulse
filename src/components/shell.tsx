"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/tokens", label: "Tokens" },
  { href: "/gpus", label: "GPUs" },
  { href: "/compare", label: "Compare" },
  { href: "/sources", label: "Sources" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-heading text-2xl tracking-tight">Laniakea AI</span>
            <span className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
              Research panel
            </span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
      <footer className="border-t border-border/80">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-1 px-4 py-4 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
          <p>
            Consumption from OpenRouter rankings and Vercel AI Gateway
            leaderboards. Token and GPU indices from Ornn Data. Quality and
            speed from Artificial Analysis. Listing paths from Hubbard and
            GPU Rental Prices.
          </p>
          <p className="font-mono">USD · refreshed every 5 minutes</p>
        </div>
      </footer>
    </div>
  );
}
