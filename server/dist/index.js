"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const logger_1 = require("./middleware/logger");
const game_1 = require("./game/game");
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const port = 3001;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: ["http://localhost:5173", "https://catanaki.pages.dev/"],
        methods: ["GET", "POST"],
    },
});
const openGames = [];
function getGameById(gameId) {
    return openGames.find((game) => game.id === gameId);
}
app.use(body_parser_1.default.json());
app.use((0, cors_1.default)({ origin: "http://localhost:5173" })); // Apply CORS to the Express app
app.use(logger_1.logger);
app.post("/game", (req, res) => {
    let game = new game_1.Game();
    openGames.push(game);
    res.send(JSON.stringify({
        id: game.id,
    }));
});
app.get("/game/:gameId", (req, res) => {
    let game = getGameById(req.params.gameId);
    if (game) {
        res.send(game.serializeGameState());
    }
    else {
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
                console.error(`Player ${name} already exists in game ${gameId} not creating`);
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
