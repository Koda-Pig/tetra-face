import { cn } from "~/lib/utils";

export type GameStatProps = {
  transitionDuration: number;
  flashTrigger: boolean;
  label: string;
  value: number;
  alignment: "left" | "right";
};

export default function GameStat({
  transitionDuration,
  flashTrigger,
  label,
  value,
  alignment,
}: GameStatProps) {
  return (
    <div
      style={{ transitionDuration: `${transitionDuration}ms` }}
      className={cn(
        "game-stat font-xl absolute top-4 z-10 grid aspect-square h-14 w-auto place-items-center bg-black px-2 py-1 text-center text-xl",
        flashTrigger && "game-stat-flash",
        alignment === "left" ? "game-stat-left" : "game-stat-right",
      )}
    >
      <p className="text-sm">{label}</p>
      <p className="value">{value}</p>
    </div>
  );
}
