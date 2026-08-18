import { getBootstrapStatic } from "@/lib/fpl/client";
import { formatCost, positionShort } from "@/lib/fpl/analysis";
import OnboardingForms from "./OnboardingForms";
import type { PickablePlayer } from "./PlayerPicker";

export default async function OnboardingPage() {
  const bootstrap = await getBootstrapStatic();

  const players: PickablePlayer[] = bootstrap.elements
    .map((p) => ({
      id: p.id,
      name: p.web_name,
      team: bootstrap.teams.find((t) => t.id === p.team)?.short_name ?? "?",
      position: positionShort(p.element_type),
      cost: formatCost(p.now_cost),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-neutral-950 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold text-white">Let&apos;s set up your squad</h1>
        <p className="max-w-md text-sm text-neutral-400">
          Pull your real FPL team by ID, or enter your 15 players manually if you&apos;d rather not share
          it. Either way, this only records what the AI suggests each gameweek — you still make any real
          transfers yourself on the official FPL site.
        </p>
      </div>
      <OnboardingForms players={players} />
    </main>
  );
}
