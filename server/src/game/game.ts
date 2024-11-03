import { Board, costDict, Player } from "./board";
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
  winner: Player | null;
  winningThreshold: number;
  longestRoad: number;
  longestRoadPlayer: Player | null;

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
    this.winner = null;
    this.winningThreshold = 10;
    this.longestRoad = 4;
    this.longestRoadPlayer = null;
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
    if (this.turn === this.players.length) {
      // make the next n turns be backwards
      this.invertTurnOrder();
      return;
    }

    if (this.turn === this.players.length * 2) {
      // make the next n turns be forwards
      this.invertTurnOrder();
      this.endInitialPlacement();
      return;
    }

    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length;
  }

  startGame() {
    this.hasStarted = true;
    this.startInitialPlacement();
  }

  endInitialPlacement() {
    this.initialPlacement = false;
    // as part of the initial placement, the whole board
    // was populated as buildable. Now we need to restrict
    // the adjacent nodes to only be buildable if the
    // player owns the road
    this.invalidateBoard();
  }

  invalidateBoard() {
    for (let node of this.board.nodes.values()) {
      node.buildable = node.buildable === "never" ? "never" : false;
    }
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
        res = this.handleBuildSettlementCommand(command as BuildSettlement);
        this.checkWinner();
        break;
      case "buildRoad":
        res = this.handleBuildRoadCommand(command as BuildRoadCommand);
        if (res) {
          this.findLongestRoad(this.getCurrentPlayer()!);
          this.checkWinner();
        }
        break;
      case "rollDice":
        res = this.handleRollDiceCommand(command as RollDiceCommand);
        break;
      case "initialPlacement":
        res = this.handleInitialPlacementCommand(
          command as InitialPlacementCommand
        );
        break;
      case "upgrade":
        res = this.handleUpgradeSettlementCommand(
          command as UpgradeSettlementCommand
        );
        this.checkWinner();
        break;
      default:
        console.log(`Unknown command type: ${command.type}`);
    }
    return res;
  }

  checkWinner() {
    for (let player of this.players) {
      if (player.score >= this.winningThreshold) {
        this.winner = player;
        break;
      }
    }
  }

  handleBuildSettlementCommand(command: BuildSettlement) {
    const { sender, location } = command;
    const player = this.getCurrentPlayer();
    if (!player || player.name !== sender) {
      console.log(`It's not ${sender}'s turn.`);
      return false;
    }
    let building = "Settlement" as BuildingType;

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
    node.buildable = "never";
    for (let neighbor of node.adjacentNodes) {
      console.log(`Restricting node ${neighbor} from being adjacent`);
      const neighborNode = this.board.nodes.get(neighbor);
      if (neighborNode) {
        neighborNode.buildable = "never";
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
        building.buildingType === "Settlement" ||
        (building.buildingType === "City" &&
          this.isRoadAdjacentToBuilding(building.location, edge))
      ) {
        break;
      }
      if (building.buildingType === "Road") {
        // should be able to extend roads
        this.isRoadAdjacentToRoad(building.location, edge);
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
        const [from, to] = edge.split("-");
        const road = player.buildRoad(edge);
        if (road) {
          roadEdge.road = road;
          console.log(`${player.name} built a road at ${edge}`);
          // add that road to each node
          this.board.nodes.get(from)!.playerRoads.add(player.name);
          this.board.nodes.get(to)!.playerRoads.add(player.name);
          console.log(
            `Player ${player.name} added road to nodes ${from} and ${to}`
          );
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

  findLongestRoad(player: Player) {
    let roads = player.buildings.filter((b) => b.buildingType === "Road");
    if (roads.length < this.longestRoad) return;

    const hasRoadBetween = (from: string, to: string): boolean => {
      const roadKey1 = `${from}-${to}`;
      const roadKey2 = `${to}-${from}`;
      return roads.some(
        (road) => road.location === roadKey1 || road.location === roadKey2
      );
    };

    let reachableIntersections = new Set<string>();
    roads.forEach((road) => {
      const [from, to] = road.location.split("-");
      reachableIntersections.add(from);
      reachableIntersections.add(to);
    });

    let maxLength = 0;
    const intersections = Array.from(reachableIntersections);

    for (let i = 0; i < intersections.length; i++) {
      for (let j = i + 1; j < intersections.length; j++) {
        const start = intersections[i];
        const end = intersections[j];

        let seen = new Set<string>();
        let maxPathLength = 0;

        const dfs = (current: string, length: number) => {
          if (current === end) {
            maxPathLength = Math.max(maxPathLength, length);
            return;
          }

          const node = this.board.nodes.get(current);
          if (!node) return;

          for (let next of node.adjacentNodes) {
            if (!seen.has(next) && hasRoadBetween(current, next)) {
              seen.add(next);
              dfs(next, length + 1);
              seen.delete(next);
            }
          }
        };

        seen.add(start);
        dfs(start, 0);
        maxLength = Math.max(maxLength, maxPathLength);
      }
    }

    console.log(`Longest road for ${player.name} is ${maxLength}`);
    if (maxLength > this.longestRoad) {
      this.longestRoad = maxLength;
      this.longestRoadPlayer = player;
    }
  }

  handleRollDiceCommand(command: RollDiceCommand) {
    const { sender } = command;
    const player = this.getCurrentPlayer();
    if (!player || player.name !== sender) {
      console.log(`It's not ${sender}'s turn.`);
      return false;
    }

    if (this.turn < this.players.length * 2 - 1) {
      this.roll = 0;
      this.nextTurn();
      return true;
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

  handleUpgradeSettlementCommand(command: UpgradeSettlementCommand) {
    // this should only work if the building is a settlement already,
    // to be upgraded to a city
    const { sender, location } = command;
    const player = this.getCurrentPlayer();
    if (!player || player.name !== sender) {
      console.log(`It's not ${sender}'s turn.`);
      return false;
    }
    let building = "City" as BuildingType;

    console.log(`Upgrading building at ${location}`);

    const node = this.board.nodes.get(location);
    if (node && node.building && node.building.buildingType === "Settlement") {
      if (player.canAffordBuilding(building)) {
        console.log(`Building ${building} at ${location}`);
        const b = player.upgradeBuilding(building, location);
        if (b) {
          node.building = b;
          console.log(`${player.name} upgraded a ${building} at ${location}`);
          this.restrictAdjacentNodes(location);
          return true;
        }
      } else {
        console.log(`${player.name} cannot afford to build a ${building}`);
        return false;
      }
    }
    console.log(`Invalid upgrade location: ${location}`);
    return false;
  }

  invertTurnOrder() {
    this.players.reverse();
    this.currentPlayerIndex = 0;
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
      player.addResource("Brick", 20);
      player.addResource("Wood", 20);
      player.addResource("Wheat", 10);
      player.addResource("Sheep", 10);
      player.addResource("Stone", 10);
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

    console.log(
      `checking if provided ${roadLocation} is close to ${buildingLocation}`
    );
    // console.log(this.board.edges);
    const road = this.board.edges.get(roadLocation);
    if (!road) {
      return false;
    }

    console.log(road);

    for (let edge of building.adjacentNodes) {
      if (edge === node1 || edge === node2) {
        return true;
      }
    }
    return false;
  }

  isRoadAdjacentToRoad(
    existingRoadLocation: string,
    newRoadLocation: string
  ): boolean {
    const [existingNode1, existingNode2] = existingRoadLocation.split("-");
    const [newNode1, newNode2] = newRoadLocation.split("-");

    return (
      existingNode1 === newNode1 ||
      existingNode1 === newNode2 ||
      existingNode2 === newNode1 ||
      existingNode2 === newNode2
    );
  }

  getValidBuildingLocations(player: Player) {
    if (!player) {
      return;
    }
    if (this.initialPlacement) {
      let serializedNodes = this.board.serializeNodes();
      return Object.keys(serializedNodes).filter(
        (key) => serializedNodes[key] === true
      );
    }
    let validBuildingLocations = new Set();
    for (let building of player.buildings) {
      if (building.buildingType === "Road") {
        // Get the nodes connected by this road
        const [node1, node2] = building.location.split("-");

        // Check each node connected to the road
        for (const node of [node1, node2]) {
          if (
            !validBuildingLocations.has(node) &&
            this.board.nodes.get(node)?.buildable !== "never"
          ) {
            validBuildingLocations.add(node);
          }
        }
      }
    }
    return [...validBuildingLocations];
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
      validBuildingLocations: this.getValidBuildingLocations(
        this.getCurrentPlayer()!
      ),
      roll: this.roll,
      players: this.players.map((player) => ({
        name: player.name,
        color: player.color,
        resources: player.resources,
        buildings: player.buildings.map((b) => ({
          type: b.buildingType,
          location: b.location,
        })),
        buildingLimits: player.buildingLimits,
        score: player.score,
      })),
      costDict: costDict,
      winner: this.winner,
      longestRoad: this.longestRoad,
      longestRoadPlayer: this.longestRoadPlayer,
    };
  }
}

type Command = {
  type: string;
  sender: string;
};

type BuildSettlement = Command & {
  type: "build";
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

type UpgradeSettlementCommand = Command & {
  type: "upgrade";
  location: string;
};
