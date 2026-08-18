import Link from "next/link";
import CountdownTimer from "./CountdownTimer";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transfers", label: "Transfers" },
  { href: "/news", label: "News" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export default function AppShell({
  children,
  deadlineIso,
  gameweekLabel,
}: {
  children: React.ReactNode;
  deadlineIso?: string;
  gameweekLabel?: string;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex flex-col gap-3 border-b border-neutral-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold">FPL AI Advisor</span>
          <nav className="flex gap-4 text-sm text-neutral-400">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {deadlineIso && gameweekLabel && (
            <CountdownTimer deadlineIso={deadlineIso} label={`${gameweekLabel} deadline`} />
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
