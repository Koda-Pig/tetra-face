import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { submitHighScoreRequestSchema } from "~/lib/highScoreSchemas";

const MODE = "singleplayer" as const;

const serializeHighScore = (highScore: { score: number; createdAt: Date }) => ({
  score: highScore.score,
  createdAt: highScore.createdAt.toISOString(),
});

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const highScore = await db.highScore.findUnique({
    where: { userId_mode: { userId, mode: MODE } },
    select: { score: true, createdAt: true },
  });

  return Response.json({
    highScore: highScore ? serializeHighScore(highScore) : null,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = submitHighScoreRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: "Invalid score" }, { status: 400 });
  }

  const { score } = parsed.data;

  const result = await db.$transaction(async (tx) => {
    const existingHighScore = await tx.highScore.findUnique({
      where: { userId_mode: { userId, mode: MODE } },
      select: { score: true, createdAt: true },
    });

    if (!existingHighScore) {
      const createdHighScore = await tx.highScore.create({
        data: { userId, mode: MODE, score },
        select: { score: true, createdAt: true },
      });

      return {
        highScore: createdHighScore,
        achievedNewHighScore: true,
      };
    }

    if (score <= existingHighScore.score) {
      return { highScore: existingHighScore, achievedNewHighScore: false };
    }

    const updatedHighScore = await tx.highScore.update({
      where: { userId_mode: { userId, mode: MODE } },
      data: { score, createdAt: new Date() },
      select: { score: true, createdAt: true },
    });

    return { highScore: updatedHighScore, achievedNewHighScore: true };
  });

  return Response.json({
    highScore: serializeHighScore(result.highScore),
    achievedNewHighScore: result.achievedNewHighScore,
  });
}
