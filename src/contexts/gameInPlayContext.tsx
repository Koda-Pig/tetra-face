"use client";

import { createContext, useContext, useState } from "react";

type GameInPlayContextType = {
  isGameInPlay: boolean;
  setIsGameInPlay: (value: boolean) => void;
};

const GameInPlayContext = createContext<GameInPlayContextType | undefined>(
  undefined,
);

export function GameInPlayProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isGameInPlay, setIsGameInPlay] = useState(false);

  return (
    <GameInPlayContext.Provider
      value={{ isGameInPlay, setIsGameInPlay }} // NOSONAR
    >
      {children}
    </GameInPlayContext.Provider>
  );
}

export function useGameInPlay() {
  const context = useContext(GameInPlayContext);
  if (context === undefined) {
    throw new Error("useGameInPlay must be used within a GameInPlayProvider");
  }
  return context;
}
