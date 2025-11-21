import { cn } from "~/lib/utils";

export default function GameStat({
  transitionDuration,
  flashTrigger,
  label,
  value,
  alignment,
}: {
  transitionDuration: number;
  flashTrigger: boolean;
  label: string;
  value: number;
  alignment: "left" | "right";
}) {
  return (
    <div
      style={{ transitionDuration: `${transitionDuration}ms` }}
      className={cn(
        "game-stat font-xl bg-background/50 absolute top-1 z-10 grid aspect-square h-14 w-auto place-items-center rounded-sm px-2 py-1 text-center text-xl",
        flashTrigger && "game-stat-flash",
        alignment === "left" ? "left-1" : "right-1",
      )}
    >
      <p className="text-sm">{label}</p>
      <p className="value">{value}</p>
    </div>
  );
}
