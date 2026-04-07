# Embeddablob Adventures

A browser-based platformer starring Embeddablob, with online multiplayer racing.

## Quick Start

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

## Controls

| Action | Key |
|--------|-----|
| Move Left | ← Arrow |
| Move Right | → Arrow |
| Jump | Space / ↑ Arrow |
| Run | Z / Shift |

## Game Modes

### Single Player
Classic Mario Level 1-1. Reach the flag pole to win!

### Multiplayer Race
1. Click **CREATE ROOM** and share the 5-letter room code
2. Other players click **JOIN ROOM** and enter the code
3. Host clicks **START RACE** — everyone plays the same level simultaneously
4. A live timeline shows each player's progress through the level
5. First to reach the flag wins!

## Features
- Faithful Level 1-1 recreation with question blocks, bricks, pipes, and staircases
- Goombas and Koopas with proper stomp mechanics
- Mushroom power-ups (grow big, break bricks)
- Coin collection and scoring
- Pit death and enemy collision
- Brick breaking when big
- Koopa shell kicking
- Online multiplayer racing with up to 8 players
- Real-time race progress timeline

## Tech Stack
- **Frontend**: HTML5 Canvas, vanilla JavaScript (pixel art rendered via code)
- **Backend**: Node.js, Express, Socket.io
