"use client";

import { Play, HourglassIcon } from "lucide-react";
import { Button } from "~/components/ui/button";

export default function WaitingForReady({
  isCurrentPlayerReady,
  onToggleReady,
}: {
  isCurrentPlayerReady: boolean;
  onToggleReady: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        size="lg"
        onClick={onToggleReady}
        className="m-12 mx-auto flex px-10 py-8 text-xl"
      >
        {isCurrentPlayerReady ? (
          <>
            <Play className="inline-block" />
            Ready! Waiting for opponent...
          </>
        ) : (
          <>
            <HourglassIcon className="hourglass-icon inline-block" /> I'm Ready
          </>
        )}
      </Button>
    </div>
  );
}
