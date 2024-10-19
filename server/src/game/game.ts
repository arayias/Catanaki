import { Board, Player } from "./board";
import type { BuildingType, Material } from "./board";

export class Game {
  id: string;
  players: Player[];
  board: Board;
  turn: number;
  currentPlayerIndex: number;

  constructor() {
    this.players = [];
    this.board = new Board();
    this.turn = 0;
    this.currentPlayerIndex = 0;
    this.id = Math.random().toString(36).substring(7);
  }

  createPlayer(name: string, color: string) {
    const player = new Player(name, color);
    this.addPlayer(player);
    return player;
  }

  addPlayer(player: Player) {
    this.players.push(player);
  }

  nextTurn() {
    this.turn++;
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length;
  }

  getCurrentPlayer(): Player {
    if (this.players.length === 0) {
      throw new Error("No players in the game");
    }
    return this.players[this.currentPlayerIndex];
  }

  handleCommand(command: Command) {
    console.log(`Game received command: ${JSON.stringify(command)}`);
    switch (command.type) {
      case "build":
        this.handleBuildCommand(command as BuildCommand);
        break;
      case "buildRoad":
        this.handleBuildRoadCommand(command as BuildRoadCommand);
        break;
      case "rollDice":
        this.handleRollDiceCommand(command as RollDiceCommand);
        break;
      default:
        console.log(`Unknown command type: ${command.type}`);
    }
  }

  handleBuildCommand(command: BuildCommand) {
    const { building, sender, location } = command;
    const player = this.getCurrentPlayer();
    if (player.name !== sender) {
      console.log(`It's not ${sender}'s turn.`);
      return;
    }

    const node = this.board.nodes.get(location);
    if (node && !node.building) {
      if (player.canAffordBuilding(building)) {
        console.log(`Building ${building} at ${location}`);
        const b = player.buildBuilding(building, location);
        if (b) {
          node.building = b;
          console.log(`${player.name} built a ${building} at ${location}`);
        }
      } else {
        console.log(`${player.name} cannot afford to build a ${building}`);
      }
    } else {
      console.log(`Invalid build location: ${location}`);
    }
  }

  handleBuildRoadCommand(command: BuildRoadCommand) {
    const { sender, edge } = command;
    const player = this.getCurrentPlayer();
    if (player.name !== sender) {
      console.log(`It's not ${sender}'s turn.`);
      return;
    }

    const roadEdge = this.board.edges.get(edge);
    if (roadEdge && !roadEdge.road) {
      if (player.canAffordBuilding("Road")) {
        console.log(`Building road at ${edge}`);
        const road = player.buildRoad(edge);
        if (road) {
          roadEdge.road = road;
          console.log(`${player.name} built a road at ${edge}`);
        }
      } else {
        console.log(`${player.name} cannot afford to build a road`);
      }
    } else {
      console.log(`Invalid road location: ${edge}`);
    }
  }

  handleRollDiceCommand(command: RollDiceCommand) {
    const { sender } = command;
    const player = this.getCurrentPlayer();
    if (player.name !== sender) {
      console.log(`It's not ${sender}'s turn.`);
      return;
    }

    const roll =
      Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2;
    console.log(`${player.name} rolled a ${roll}`);

    this.distributeResources(roll);
    this.nextTurn();
  }

  distributeResources(roll: number) {
    for (let player of this.players) {
      for (let building of player.buildings) {
        let multiplier = 1;
        if (building.buildingType === "City") {
          multiplier = 2;
        } else {
          continue;
        }
        let location = building.location;
        let node = this.board.nodes.get(location);
        if (node) {
          for (let tile of node.adjacentTiles) {
            if (tile.roll === roll) {
              let material = tile.land as Exclude<Material, "Desert">;
              player.addResource(material, multiplier);
              console.log(
                `${player.name} received ${multiplier} ${material} from a ${building.buildingType} at ${location}`
              );
            }
          }
        }
      }
    }
  }

  serializeGameState() {
    return {
      id: this.id,
      turn: this.turn,
      currentPlayer: this.getCurrentPlayer().name,
      board: this.board.serialize(),
      players: this.players.map((player) => ({
        name: player.name,
        color: player.color,
        resources: player.resources,
        buildings: player.buildings.map((b) => ({
          type: b.buildingType,
          location: b.location,
        })),
      })),
    };
  }
}

type Command = {
  type: string;
  sender: string;
};

type BuildCommand = Command & {
  type: "build";
  building: BuildingType;
  location: string;
};

type BuildRoadCommand = Command & {
  type: "buildRoad";
  edge: string;
};

type RollDiceCommand = Command & {
  type: "rollDice";
};
