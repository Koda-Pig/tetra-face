-- CreateEnum
CREATE TYPE "Gamemode" AS ENUM ('singleplayer', 'multiplayer');

-- CreateTable
CREATE TABLE "HighScore" (
    "id" TEXT NOT NULL,
    "mode" "Gamemode" NOT NULL,
    "score" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "HighScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HighScore_userId_mode_idx" ON "HighScore"("userId", "mode");

-- AddForeignKey
ALTER TABLE "HighScore" ADD CONSTRAINT "HighScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
