import type { DisplayPlayer } from "@/lib/fpl/display";

const POSITION_ORDER: DisplayPlayer["position"][] = ["GKP", "DEF", "MID", "FWD"];

function PlayerCard({ player }: { player: DisplayPlayer }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-neutral-900 px-3 py-2 text-center">
      <span className="text-sm font-medium text-neutral-100">
        {player.name}
        {player.isCaptain && <span className="ml-1 text-emerald-400">(C)</span>}
        {player.isViceCaptain && <span className="ml-1 text-neutral-400">(VC)</span>}
      </span>
      <span className="text-xs text-neutral-500">
        {player.team} · {player.cost}
      </span>
    </div>
  );
}

export default function SquadView({
  startingXi,
  bench,
  formation,
}: {
  startingXi: DisplayPlayer[];
  bench: DisplayPlayer[];
  formation: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Starting XI</h2>
        <span className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-400">{formation}</span>
      </div>
      <div className="flex flex-col gap-4">
        {POSITION_ORDER.map((pos) => {
          const inPos = startingXi.filter((p) => p.position === pos);
          if (inPos.length === 0) return null;
          return (
            <div key={pos} className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {inPos.map((p) => (
                <PlayerCard key={p.id} player={p} />
              ))}
            </div>
          );
        })}
      </div>

      <h3 className="text-sm font-semibold text-neutral-300">Bench (sub order)</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {bench.map((p, i) => (
          <div key={p.id} className="relative">
            <span className="absolute -left-1 -top-1 z-10 rounded-full bg-neutral-700 px-1.5 text-[10px] text-neutral-300">
              {i + 1}
            </span>
            <PlayerCard player={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
