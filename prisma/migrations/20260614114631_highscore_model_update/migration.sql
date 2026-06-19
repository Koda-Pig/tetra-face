/*
  Warnings:

  - A unique constraint covering the columns `[userId,mode]` on the table `HighScore` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "HighScore_userId_mode_idx";

-- CreateIndex
CREATE UNIQUE INDEX "HighScore_userId_mode_key" ON "HighScore"("userId", "mode");
