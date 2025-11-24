import GameStat from "./gameStat";
import { FLASH_TRANSITION_DURATION_MS } from "~/constants";
import type { UIState } from "~/types";

export default function GameStats({ uiState }: { uiState: UIState }) {
  const statsArray = [
    {
      label: "score",
      value: uiState.score,
      flashTrigger: uiState.scoreFlash,
      alignment: "right" as const,
    },
    {
      label: "level",
      value: uiState.level,
      flashTrigger: uiState.levelFlash,
      alignment: "left" as const,
    },
  ];
  return (
    <>
      {statsArray.map((stat) => (
        <GameStat
          key={stat.label}
          label={stat.label}
          value={stat.value}
          flashTrigger={stat.flashTrigger}
          alignment={stat.alignment}
          transitionDuration={FLASH_TRANSITION_DURATION_MS}
        />
      ))}
    </>
  );
}
