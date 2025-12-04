# Tetra Face (it's a bad name, I know)

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

The idea for this project is to create a multiplayer game where users can log in, chat, and play against each other. While Tetris is often recommended as a simple game to build, it is actually trickier than you would assume.

Refer to this for the Tetris rules:
https://tetris.wiki/Tetris_Guideline

## Tech stack docs

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Tailwind CSS](https://tailwindcss.com)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## Running the project

```bash
pnpm install
```

```bash
docker-compose up -d
```

```bash
pnpm run dev
```

## TODO

### User Interface

- [ ] Get it looking decent

Refer to the oldschool UI to make sure I have everything I need. This is a convenient source for that.
https://play.tetris.com/

### Gameplay

- [x] Implement the 7-bag randomizer method for selecting tetrominos
- [x] Implement collision detection for moving the tetrominos
- [x] Implement collision detection for rotating the tetrominos
- [x] Implement the wall kicks for rotating tetrominos
- [x] Implement the soft drop
- [x] Implement the hard drop
- [x] Implement the line clear
- [x] Implement the game over
- [x] Implement counter clockwise rotation (currently only clockwise with space key)
- [x] Implement scoring system
  - [x] line clear scoring
  - [ ] T-Spin scoring
- [x] Implement the game reset
- [x] Add leveling system
- [x] Implement the game pause / resume. Consider the way unity handles this with a time scale. Noted here: https://github.com/Koda-Pig/hadeez/blob/f2a531ec9eda007310b538d309b30b79327c4277/README.md?plain=1#L38
- [x] add visual effect when row is cleared
- [x] add piece 'hold' feature
  - [ ] add sub-feature to click opponents hold piece to make it drop
- [ ] ensure implementation matches guidelines: https://tetris.fandom.com/wiki/Tetris_Guideline
- [x] add controller support - refer to my implementation in [this repo](https://github.com/Koda-Pig/not-a-pig/blob/118776208c649313edd4dbf4d596bdd837a72aa4/src/input.ts#L53)
- [x] add feature to send lines cleared to opponent - see: https://tetris.wiki/Garbage
  - [x] Get base feature working
  - [x] Add checks to see what the number of incoming garbage lines is, and determine how much to process based on how many lines the user cleared while the garbage Q was waiting.
  - [x] Fix bug in opponent rendered game where the piece placed + garbage received events aren't being processed in the correct order.
  - [ ] double check this meets all the requirements for the garbage system.
  - [x] fix scenario where player browser window loses focus and their animation loop stops. This should pause the game or keep running, one of the two.
- [x] implement ghost pieces

#### SCORING SYSTEM

- Basic Line Clears: [implemented]
-
- Single: 100 × level
- Double: 300 × level
- Triple: 500 × level
- Tetris (4 lines): 800 × level
-
- T-Spins: [not-implemented]
-
- T-Spin Single: 800 × level
- T-Spin Double: 1200 × level
- T-Spin Triple: 1600 × level
- Mini T-Spin variations exist with lower scores

### Multiplayer

- [x] set up multiplayer
  - [x] use socket.io
  - [x] set up `room` for game sessions?
  - [x] Host creates room, invite single player to join.
  - [x] add game ready state for players
  - [x] fix bug where pieces dropped in either host or oopponent boards are placed in both boards (was caused by shared object reference to board)
  - [x] send over other player data (current piece, etc. {atm just inputs being sent})
    - [x] host player emits when new piece is spawned, with Piece data.
    - [x] Opponent player reads that new piece that is spawned, and passes it to their own instance of the 'opponentGame' component.
    - [x] OpponentGame has a way to use the piece that is spawned to it, instead of generating its own.
    - [x] Game over and
    - [x] play/ pause state
  - [x] handle players leaving the room/ exiting the game

### Auth

Only discord auth set up for now.

- [x] attach user id to game session
- [x] discord auth: https://discord.com/developers/applications
- [x] add google auth using next auth. https://next-auth.js.org/providers/google

### Deployment

- [x] Deploy web app

### Other

- [ ] replace restart button with resume + rematch buttons in host game
  - [x] remove restart btn
  - [x] add resume btn
  - [x] add surrender btn
  - [ ] add rematch btn
- [x] re-implement single player (low priority)
- [ ] Update game events to only send over tetromino type, not the whole piece. It's unnecessary usage of bandwidth
  - Actually need to double check this. I think the whole piece may need to be sent for most cases, as the whole piece is needed for the `placePiece` function in the opponent game. Maybe, maybe not.
- [x] clean up this readme
- [ ] performance checks
- [ ] security checks
- [ ] Hide 'create room' button if a player has already created a room and is waiting for players to join

---

## Deployment

Deployed using fly.io here:
https://tetra-face.fly.dev/

Run to deploy:

```bash
fly deploy
```

don't use their ui it's crap

## Troubleshooting

check fly logs:

```bash
fly logs -a tetra-face
```

Make sure both tetra-face-db and tetra-face apps are running.

```bash
fly machine start --app YOUR_APP_NAME_HERE
```

check docker build locally

```bash
docker build -t tetra-face .
```

then

```bash
docker run -p 3000:3000 --env-file .env.docker tetra-face
```

---

Note about the `DATABASE_URL` var in fly.io deployment:

Don't use localhost, host.docker.internal, or 0.0.0.0 for production - those are only for local Docker testing. Fly.io uses internal networking with .flycast domains for database connections.
The fly postgres attach command will replace the current `DATABASE_URL` secret with the correct production value automatically.

remember to set any new env secrets on fly.io using

```bash
fly secrets set {SECRET=VALUE}
```
