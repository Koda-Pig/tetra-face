"use client";

import { useState } from "react";
import GameCanvas from "./game-canvas";
import { Button } from "~/components/ui/button";

export default function GameSection() {
  const [isGameStarted, setIsGameStarted] = useState(false);

  return (
    <div className="my-8">
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
