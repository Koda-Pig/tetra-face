"use client";

import BaseGame from "./baseGame";

export default function OpponentGame({
  userId,
  currentKey,
}: {
  userId: string;
  currentKey: string | null;
}) {
  return <BaseGame userId={userId} currentKey={currentKey} />;
}
