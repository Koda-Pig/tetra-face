"use client";

import { useState } from "react";
import GameCanvas from "./gameCanvas";
import { Button } from "~/components/ui/button";

export default function GameSection() {
  const [isGameStarted, setIsGameStarted] = useState(false);

  return (
    <div className="my-8">
      <div className="bg-background/90 text-foreground fixed top-0 right-0 left-0 w-full px-6 py-3">
        <p className="mb-3 text-center text-lg font-semibold">Controls</p>
        <div className="flex justify-center">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold">Move:</span>
              <span className="font-mono">← →</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">Soft Drop:</span>
              <span className="font-mono">↓</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">Hard Drop:</span>
              <span className="font-mono">↑</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">Rotate:</span>
              <span className="font-mono">Space / Z</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">Pause:</span>
              <span className="font-mono">Escape</span>
            </div>
          </div>
        </div>
      </div>
      {isGameStarted ? (
        <GameCanvas />
      ) : (
        <Button
          size="lg"
          variant="secondary"
          onClick={() => setIsGameStarted(true)}
        >
          Start Game
        </Button>
      )}
    </div>
  );
}
