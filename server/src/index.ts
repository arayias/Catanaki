import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import type { Application } from "express";
import { logger } from "./middleware/logger";
import { Game } from "./game/game";
import { Server } from "socket.io";
import http from "http";

const app: Application = express();
const server = http.createServer(app);
const port = 3001;
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://catanaki.pages.dev/"],
    methods: ["GET", "POST"],
  },
});

const openGames: Game[] = [];

function getGameById(gameId: string): Game | undefined {
  return openGames.find((game) => game.id === gameId);
}

app.use(bodyParser.json());
app.use(
  cors({ origin: ["http://localhost:5173", "https://catanaki.pages.dev"] })
); // Apply CORS to the Express app
app.use(logger);

app.post("/game", (req, res) => {
  let game = new Game();
  openGames.push(game);
  res.send(
    JSON.stringify({
      id: game.id,
    })
  );
});

app.get("/game/:gameId", (req, res) => {
  let game = getGameById(req.params.gameId);
  if (game) {
    res.send(game.serializeGameState());
  } else {
    res.status(404).send("Game not found");
  }
});

io.on("connection", (socket) => {
  socket.on("join game", (gameId) => {
    socket.join(gameId);
    console.log(`User ${socket.id} joined game: ${gameId}`);
    let game = getGameById(gameId);
    if (!game) {
      return;
    }

    socket.on("create player", (name) => {
      console.log(`Creating player: ${name} for game: ${gameId}`);
      let alreadyExists = game.players.some((player) => player.name === name);
      if (alreadyExists) {
        console.error(
          `Player ${name} already exists in game ${gameId} not creating`
        );
        return;
      }
      game.createPlayer(name);
    });

    socket.on("start game", () => {
      if (game.hasStarted) {
        console.error("Game has already started");
        return;
      }
      game.startGame();
      socket.emit("game update", game.serializeGameState());
      io.to(gameId).emit("game update", game.serializeGameState());
    });
    socket.on("game command", (command) => {
      if (!game || !game.hasStarted) {
        console.error("game id not found or game has not started");
        return;
      }
      let parsedCommand = JSON.parse(command);
      let didCommandSucceed = game.handleCommand(parsedCommand);
      if (didCommandSucceed) {
        io.to(gameId).emit("game update", game.serializeGameState());
      }
    });
  });
});

server.listen(port, () => {
  console.log(`Server and socket running at http://localhost:${port}`);
});
