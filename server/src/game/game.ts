import { Board, Player } from "./board";
import type { BuildingType, Material } from "./board";

export class Game {
  id: string;
  players: Player[];
  board: Board;
  turn: number;
  currentPlayerIndex: number;
  initialPlacement: boolean;
  initialPlacementTurn: number;
  hasStarted: boolean;
  roll: number;

  constructor() {
    this.players = [];
    this.board = new Board();
    this.turn = 0;
    this.currentPlayerIndex = 0;
    this.id = Math.random().toString(36).substring(7);
    this.initialPlacement = false;
    this.initialPlacementTurn = 0;
    this.hasStarted = false;
    this.roll = 0;
  }

  startInitialPlacement() {
    this.initialPlacement = true;
    this.initialPlacementTurn = 1;
    this.distributeResourcesForInitialPlacement();
  }

  createPlayer(name: string, color: string) {
    const randomHexColor = Math.floor(Math.random() * 16777215).toString(16);
    const player = new Player(name, `#${randomHexColor}`);
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

  startGame() {
    this.hasStarted = true;
    this.startInitialPlacement();
  }

  getCurrentPlayer(): Player | undefined {
    if (this.players.length === 0) {
      return undefined;
    }
    return this.players[this.currentPlayerIndex];
  }

  handleCommand(command: Command) {
    console.log(`Game received command: ${JSON.stringify(command)}`);
    let res = false;
    switch (command.type) {
      case "build":
        res = this.handleBuildCommand(command as BuildCommand);
        break;
      case "buildRoad":
        res = this.handleBuildRoadCommand(command as BuildRoadCommand);
        break;
      case "rollDice":
        res = this.handleRollDiceCommand(command as RollDiceCommand);
        break;
      case "initialPlacement":
        res = this.handleInitialPlacementCommand(
          command as InitialPlacementCommand
        );
        break;
      default:
        console.log(`Unknown command type: ${command.type}`);
    }
    return res;
  }

  handleBuildCommand(command: BuildCommand) {
    const { building, sender, location } = command;
    const player = this.getCurrentPlayer();
    if (!player || player.name !== sender) {
      console.log(`It's not ${sender}'s turn.`);
      return false;
    }

    const node = this.board.nodes.get(location);
    if (node && !node.building) {
      if (player.canAffordBuilding(building)) {
        console.log(`Building ${building} at ${location}`);
        const b = player.buildBuilding(building, location);
        if (b) {
          node.building = b;
          console.log(`${player.name} built a ${building} at ${location}`);
          this.restrictAdjacentNodes(location);
        }
      } else {
        console.log(`${player.name} cannot afford to build a ${building}`);
        return false;
      }
    } else {
      console.log(`Invalid build location: ${location}`);
      return false;
    }
    return true;
  }

  restrictAdjacentNodes(location: string) {
    const node = this.board.nodes.get(location);
    if (!node) return;
    for (let neighbor of node.adjacentNodes) {
      console.log(`Restricting node ${neighbor} from being adjacent`);
      const neighborNode = this.board.nodes.get(neighbor);
      if (neighborNode) {
        neighborNode.buildable = false;
      }
    }
  }

  handleBuildRoadCommand(command: BuildRoadCommand) {
    const { sender, edge } = command;
    const player = this.getCurrentPlayer();
    if (!player || player.name !== sender) {
      console.log(`It's not ${sender}'s turn.`);
      return false;
    }
    for (let building of player.buildings) {
      if (
        building.buildingType === "Settlement" &&
        this.isRoadAdjacentToBuilding(building.location, edge)
      ) {
        break;
      }
      if (building.buildingType === "City") {
        break;
      }
      console.log(
        `Cannot build road at ${edge} because it is not adjacent to a settlement`
      );
      return false;
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
        return false;
      }
    } else {
      console.log(`Invalid road location: ${edge}`);
      return false;
    }
    return true;
  }

  handleRollDiceCommand(command: RollDiceCommand) {
    const { sender } = command;
    const player = this.getCurrentPlayer();
    if (!player || player.name !== sender) {
      console.log(`It's not ${sender}'s turn.`);
      return false;
    }

    this.roll =
      Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2;
    console.log(`${player.name} rolled a ${this.roll}`);

    this.distributeResources(this.roll);
    this.nextTurn();
    return true;
  }

  handleInitialPlacementCommand(command: InitialPlacementCommand) {
    const { sender, settlementLocation, roadLocation } = command;
    const player = this.getCurrentPlayer();
    if (!player || player.name !== sender) {
      console.log(`It's not ${sender}'s turn.`);
      return false;
    }

    if (this.initialPlacementTurn === 1) {
      if (player.canAffordBuilding("Settlement")) {
        const node = this.board.nodes.get(settlementLocation);
        if (node && !node.building) {
          const b = player.buildBuilding("Settlement", settlementLocation);
          if (b) {
            node.building = b;
            console.log(
              `${player.name} built a Settlement at ${settlementLocation}`
            );
          }
        }
      } else {
        console.log(`${player.name} cannot afford to build a Settlement`);
        return false;
      }
      this.initialPlacementTurn = 2;
    } else if (this.initialPlacementTurn === 2) {
      if (player.canAffordBuilding("Road")) {
        const edge = this.board.edges.get(roadLocation);
        if (edge && !edge.road) {
          const road = player.buildRoad(roadLocation);
          if (road) {
            edge.road = road;
            console.log(`${player.name} built a Road at ${roadLocation}`);
          }
        }
      } else {
        console.log(`${player.name} cannot afford to build a Road`);
        return false;
      }
      this.nextTurn();
      if (this.currentPlayerIndex === 0) {
        this.initialPlacement = false;
      }
    }
    return true;
  }

  distributeResources(roll: number) {
    console.log(`Distributing resources for roll: ${roll}`);
    for (let player of this.players) {
      console.log(`Checking for resources for ${player.name}`);
      for (let building of player.buildings) {
        console.log(`Checking building at ${building.location}`);
        if (building.buildingType == "Road") {
          continue;
        }
        let multiplier = 1;
        if (building.buildingType === "City") {
          multiplier = 2;
        }
        let location = building.location;
        let node = this.board.nodes.get(location);
        console.log(`Checking for resources at ${location}`);
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

  distributeResourcesForInitialPlacement() {
    for (let player of this.players) {
      player.addResource("Brick", 2);
      player.addResource("Wood", 2);
      player.addResource("Wheat", 1);
      player.addResource("Sheep", 1);
    }
  }

  isRoadAdjacentToBuilding(buildingLocation: string, roadLocation: string) {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) {
      return false;
    }
    const building = this.board.nodes.get(buildingLocation);

    const [node1, node2] = roadLocation.split("-");
    if (
      !building ||
      !building.building ||
      building.building.owner !== currentPlayer.name
    ) {
      return false;
    }

    const road = this.board.edges.get(roadLocation);
    if (!road || !road.road) {
      return false;
    }

    for (let edge of building.adjacentNodes) {
      if (edge === node1 || edge === node2) {
        return true;
      }
    }
    return false;
  }

  serializeGameState() {
    return {
      id: this.id,
      turn: this.turn,
      hasStarted: this.hasStarted,
      currentPlayer: this.getCurrentPlayer()?.name,
      board: this.board.serializeBoard(),
      nodes: this.board.serializeNodes(),
      edges: this.board.serializeEdges(),
      roll: this.roll,
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

type InitialPlacementCommand = Command & {
  type: "initialPlacement";
  settlementLocation: string;
  roadLocation: string;
};
