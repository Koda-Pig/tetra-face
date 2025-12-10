# Tetrus

A multiplayer online Tetris game where users can log in, chat, and play against each other.

Refer to this for the Tetris rules:
https://tetris.wiki/Tetris_Guideline

## Tech stack docs

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Tailwind CSS](https://tailwindcss.com)
- [Socket.io](https://socket.io)

## Technical Details

### Socket.io Setup

Socket.io is integrated directly into the Next.js server. This works as follows:

- **Server config**: A custom HTTP server is created that wraps Next.js.
- **Integration**: The Socket.io server shares the same HTTP server instance as the Next.js server, which lets them run on the same port.

### Multiplayer Setup

A client-server architecture is used (instead of peer-to-peer) because it provides better security, reliability, and simplicity for this application, and the higher latency cost of this choice is not a significant issue for this application.

- **Server role**: acts as a relay between clients. It manages game rooms in-memory and broadcasts game events between players in the same room.
- **Game state management**: Game state is managed on the client. This is because the game state is complex and requires a lot of computation, and it is not practical to manage it on the server. Each player maintains their own local game state, with the server relaying actions between them.
- **Event flow**: When a player performs an action (move, rotate, drop, etc.), it's sent to the server, which then broadcasts it to the opponent.

### Database

Prisma is used for database management. After setting up the database using Docker Compose, you need to run migrations. For local development, run `pnpm run db:generate` (which runs `prisma migrate dev`). This will create and apply any pending migrations.

## Running the project

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) Version 25^
- [Node.js](https://nodejs.org) Version 20^
- [PNPM](https://pnpm.io) Version 9^

  ### Environment Variables

  Copy `.env.example` to `.env` and configure:
  - `DATABASE_URL`: PostgreSQL connection string (format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`)
    - Default for local development: `postgresql://postgres:password@localhost:5432/tetra-face`
  - `NEXTAUTH_URL`: Your application URL (defaults to `http://localhost:3000` for local development)
  - `AUTH_SECRET`: Secret for NextAuth.js (generate with `openssl rand -base64 32`)
  - `GOOGLE_CLIENT_ID`: Google OAuth client ID
  - `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
  - `AUTH_DISCORD_ID`: Discord OAuth application ID
  - `AUTH_DISCORD_SECRET`: Discord OAuth application secret

  Optional (for docker-compose):
  - `POSTGRES_USER`: PostgreSQL user (defaults to `postgres`)
  - `POSTGRES_PASSWORD`: PostgreSQL password (defaults to `password`)

Run the following commands to get the project running locally:

```bash
pnpm install
```

```bash
docker-compose up -d
```

```bash
pnpm run db:generate
```

```bash
pnpm run dev
```

## Gameplay Features

- 7-bag randomizer method for selecting tetrominos
- Leveling system: every 10 lines cleared, the level increases by 1. The higher the level, the faster the pieces fall.
- T-spin detection and scoring (see [tetris.wiki/T-spin](https://tetris.wiki/T-Spin))
  - The technical implementation for this is to check if at least 3 of the 4 corners diagonal to the center of the T-piece are occupied when the piece is placed.
- Visual effects when rows are cleared
- Hold piece feature: hold a piece to use it later, or to switch out for a different piece.
- Next piece preview: see the next piece that will be spawned.
- Ghost piece: see where the piece will land when it is placed.
- Keyboard and controller support
- Garbage system: when rows are cleared, garbage lines are sent to the opponent:
  - Single line: 0 garbage lines
  - Double: 1 garbage line
  - Triple: 2 garbage lines
  - Tetris (4 lines): 4 garbage lines

## Other Features

- Authentication: Google and Discord

## Scoring System

### Basic Line Clears

- Single: 100 × level
- Double: 300 × level
- Triple: 500 × level
- Tetris (4 lines): 800 × level

### T-Spins

- T-Spin Single: 800 × level
- T-Spin Double: 1200 × level
- T-Spin Triple: 1600 × level

## Deployment

Deployed using fly.io here:
https://tetra-face.fly.dev/

CI/CD is setup to deploy automatically when a new commit is pushed to the main branch.

### Check fly logs:

```bash
fly logs -a tetra-face
```

Note about the `DATABASE_URL` var in fly.io deployment:

This does not use localhost, host.docker.internal, or 0.0.0.0 in production - those are only for local Docker testing. Fly.io uses internal networking with .flycast domains for database connections.
The fly postgres attach command will replace the current `DATABASE_URL` secret with the correct production value automatically.

## Set environment variables on fly.io

```bash
fly secrets set {SECRET=VALUE}
```

## Troubleshooting

### check docker build locally

```bash
docker build -t tetra-face .
```

then

```bash
docker run -p 3000:3000 --env-file .env.docker tetra-face
```

## Other Notes

I changed the name from `Tetra Face` to `Tetrus` because Tetra Face just isn't a good name.

## TODO

- [ ] bug: it shows 'waiting for response' on EVERY single available room. not just the room the user is trying to join.
- [ ] chore: performance checks
- [ ] feat: add rematch button
- [ ] feat: high scores
- [ ] feat: click opponents hold piece to make it drop
