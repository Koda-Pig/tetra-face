"use client";

import BaseGame from "./baseGame";

export default function OpponentGame({
  userId,
  currentKey,
}: {
  userId: string;
  currentKey: string | null;
}) {
  return (
    <div className="pointer-events-none">
      <BaseGame userId={userId} currentKey={currentKey} />;
    </div>
  );
}
