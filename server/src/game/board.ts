const materials = [
  "Wood",
  "Stone",
  "Wheat",
  "Sheep",
  "Brick",
  "Desert",
] as const;

export type Material = (typeof materials)[number];
export type Resource = Exclude<Material, "Desert">;

export type BoardPlaceHolders = "X" | "#" | "D";
export type BuildingType = "Settlement" | "City" | "Road";

class Tile {
  land: Material | null;
  hasRobber: boolean;
  roll: number;
  nodes: Node[];

  constructor(material: Material | null = null, roll: number = 0) {
    this.land = material;
    this.hasRobber = false;
    this.roll = roll;
    this.nodes = [];
  }
}

type Node = {
  x: string;
  y: string;
  adjacentTiles: Tile[];
  adjacentNodes: string[];
  buildable: boolean | "never";
  building: Building | null;
  playerRoads: Set<string>;
};

type Edge = {
  node1: string;
  node2: string;
  road: Building | null;
};

export class Board {
  board: Tile[][];
  inputBoard: BoardPlaceHolders[][];
  spawnableMaterials: Material[];
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  robberTile: Tile | null;

  constructor() {
    this.spawnableMaterials = materials.slice(0, materials.length - 1);
    this.inputBoard = exampleBoard;
    this.board = this.constructBoard();
    this.nodes = new Map();
    this.edges = new Map();
    this.initializeNodesAndEdges();
  }

  constructBoard() {
    let board: Tile[][] = [];
    let lastDesertTile: Tile | null = null;
    for (let row = 0; row < this.inputBoard.length; row++) {
      let rowArray: Tile[] = [];
      for (let col = 0; col < this.inputBoard[row].length; col++) {
        let material = this.inputBoard[row][col];
        let roll = 0;
        let chosenMaterial: Material | null = null;
        if (material === "#") {
          chosenMaterial =
            this.spawnableMaterials[
              Math.floor(Math.random() * this.spawnableMaterials.length)
            ];
          roll =
            Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2;
          while (roll === 7) {
            roll =
              Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2;
          }
        }
        if (material === "D") {
          chosenMaterial = "Desert";
          roll = -1;
          lastDesertTile = new Tile(chosenMaterial, roll);
          rowArray.push(lastDesertTile);
          continue;
        }
        rowArray.push(new Tile(chosenMaterial, roll));
      }
      if (lastDesertTile) {
        lastDesertTile.hasRobber = true;
        this.robberTile = lastDesertTile;
      }
      board.push(rowArray);
    }
    return board;
  }

  initializeNodesAndEdges() {
    for (let row = 0; row < this.board.length; row++) {
      for (let col = 0; col < this.board[row].length; col++) {
        this.createNodesForTile(row, col);
      }
    }
    this.createEdges();
  }

  createNodesForTile(row: number, col: number) {
    let tile = this.board[row][col];
    if (tile.land == null) return;

    let horiz_offset = row % 2 === 0 ? 0 : 0.5;
    let vertical_offset = row * -0.25;

    let nodes = [
      [row + vertical_offset + 0.5, col + horiz_offset], // top
      [row + vertical_offset - 0.5, col + horiz_offset], // bottom
      [row + vertical_offset - 0.25, col + horiz_offset + 0.5], // top-right
      [row + vertical_offset - 0.25, col + horiz_offset - 0.5], // top-left
      [row + vertical_offset + 0.25, col + horiz_offset - 0.5], // bottom-left
      [row + vertical_offset + 0.25, col + horiz_offset + 0.5], // bottom-right
    ];

    for (let node of nodes) {
      let key = `${node[0].toFixed(2)},${node[1].toFixed(2)}`;

      if (!this.nodes.has(key)) {
        this.nodes.set(key, {
          x: node[1].toFixed(2),
          y: node[0].toFixed(2),
          adjacentTiles: [],
          adjacentNodes: [],
          building: null,
          buildable: true,
          playerRoads: new Set(),
        });
      }

      let currentNode = this.nodes.get(key)!;
      // also add the node to the tile
      tile.nodes.push(currentNode);
      if (!currentNode.adjacentTiles.includes(tile)) {
        currentNode.adjacentTiles.push(tile);
      }
    }
  }

  createEdges() {
    for (let [nodeKey, node] of this.nodes) {
      let [row, col] = nodeKey.split(",").map((x) => parseFloat(x));

      let adjacentPoints = [
        [row + 0.5, col], // top
        [row - 0.5, col], // bottom
        [row - 0.25, col + 0.5],
        [row - 0.25, col - 0.5],
        [row + 0.25, col - 0.5],
        [row + 0.25, col + 0.5],
      ];

      for (let point of adjacentPoints) {
        let pointKey = `${point[0].toFixed(2)},${point[1].toFixed(2)}`;
        if (this.nodes.has(pointKey)) {
          if (
            !node.adjacentNodes.includes(pointKey) &&
            this.hasACommonAdjacentMaterialTile(row, col, point[0], point[1])
          ) {
            node.adjacentNodes.push(pointKey);
          }

          const edgeKey = this.getEdgeKey(nodeKey, pointKey);
          if (!this.edges.has(edgeKey)) {
            this.edges.set(edgeKey, {
              node1: nodeKey,
              node2: pointKey,
              road: null,
            });
          }
        }
      }
    }
  }

  hasACommonAdjacentMaterialTile(
    row1: number,
    col1: number,
    row2: number,
    col2: number
  ): boolean {
    const node1 = this.nodes.get(`${row1.toFixed(2)},${col1.toFixed(2)}`);
    const node2 = this.nodes.get(`${row2.toFixed(2)},${col2.toFixed(2)}`);
    if (!node1 || !node2) return false;
    for (let tile of node1.adjacentTiles) {
      for (let otherTile of node2.adjacentTiles) {
        if (tile === otherTile) return true;
      }
    }
    return false;
  }

  getEdgeKey(node1: string, node2: string): string {
    return [node1, node2].sort().join("-");
  }

  serializeBoard(): string[][] {
    let serializedBoard: string[][] = [];
    for (let row = 0; row < this.board.length; row++) {
      serializedBoard[row] = [];
      for (let col = 0; col < this.board[row].length; col++) {
        let tile = this.board[row][col];
        let material = tile.land;
        let roll = tile.roll;
        let hasRobber = tile.hasRobber;
        serializedBoard[row][col] = `${material} ${roll} ${hasRobber}`.trim();
      }
    }
    return serializedBoard;
  }

  serializeNodes() {
    let serializedNodes: { [key: string]: Building | boolean | "never" } = {};
    for (let [key, node] of this.nodes) {
      if (node.building) {
        serializedNodes[key] = node.building;
      } else {
        serializedNodes[key] = node.buildable;
      }
    }
    return serializedNodes;
  }

  serializeEdges() {
    // let serializedEdges: { [key: string]: Building | null } = {};
    // for (let [key, edge] of this.edges) {
    //   serializedEdges[key] = edge.road;
    // }
    // return serializedEdges;
    let adjacencyList: { [key: string]: string[] } = {};
    for (let [key, node] of this.nodes) {
      adjacencyList[key] = [];
      for (let neighbor of node.adjacentNodes) {
        adjacencyList[key].push(neighbor);
      }
      adjacencyList[key] = adjacencyList[key].sort();
    }
    return adjacencyList;
  }

  moveRobber(location: string): boolean {
    if (this.robberTile) {
      this.robberTile.hasRobber = false;
    }
    let [row, col] = location.split(",");
    let rowNo = parseInt(row);
    let colNo = parseInt(col);
    this.robberTile = this.board[rowNo][colNo];
    this.robberTile.hasRobber = true;
    return true;
  }

  canStealFromPlayer(player: Player) {
    if (!this?.robberTile || !this.robberTile?.nodes) return false;
    for (let node of this.robberTile.nodes) {
      if (node.building?.owner === player.name) {
        return true;
      }
    }
    return false;
  }
}

class Building {
  buildingType: BuildingType;
  location: string;
  upgradeable: boolean;
  owner: Player["name"];
  cost: { [key in Material]?: number };

  constructor(
    buildingType: BuildingType,
    location: string,
    owner: Player["name"]
  ) {
    this.buildingType = buildingType;
    this.location = location;
    this.upgradeable = buildingType === "Settlement";
    this.cost = costDict[buildingType];
    this.owner = owner;
  }
}

export class Player {
  name: string;
  color: string;
  score: number;
  resources: { [key in Resource]: number };
  buildings: Building[];
  buildingLimits: { [key in BuildingType]: number };
  constructor(name: string) {
    this.name = name;
    this.color = `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")}`;
    this.resources = {
      Wood: 0,
      Stone: 0,
      Wheat: 0,
      Sheep: 0,
      Brick: 0,
    };
    this.buildingLimits = {
      City: 4,
      Settlement: 4,
      Road: 999,
    };
    this.buildings = [];
    this.score = 0;
  }

  addResource(material: Resource, amnt: number) {
    this.resources[material] += amnt;
  }

  removeResource(material: Resource, amnt: number) {
    this.resources[material] -= amnt;
  }

  stealRandomResource() {
    let resources = Object.keys(this.resources);
    let filteredRandomResources = resources.filter(
      (resource) => this.resources[resource as Resource] > 0
    );
    let random = Math.floor(Math.random() * filteredRandomResources.length);
    let stolenResource = filteredRandomResources[random] as Exclude<
      Material,
      "Desert"
    >;
    this.resources[stolenResource as Resource] -= 1;
    return stolenResource;
  }

  getTotalResources() {
    return Object.values(this.resources).reduce((a, b) => a + b);
  }

  canAffordBuilding(buildingType: BuildingType) {
    let cost = costDict[buildingType];
    for (let material in cost) {
      if (
        this.resources[material as Resource] < (cost[material as Material] ?? 0)
      ) {
        return false;
      }
    }
    return true;
  }

  buildBuilding(buildingType: BuildingType, location: string) {
    if (
      this.canAffordBuilding(buildingType) &&
      this.buildingLimits[buildingType] > 0
    ) {
      let building = new Building(buildingType, location, this.name);
      this.buildings.push(building);
      for (let material in costDict[buildingType]) {
        this.removeResource(
          material as Resource,
          costDict[buildingType][material as Material] ?? 0
        );
      }
      if (buildingType !== "Road") {
        this.score += 1;
      }
      this.buildingLimits[buildingType] -= 1;
      return building;
    }
    return null;
  }

  upgradeBuilding(buildingType: BuildingType, location: string) {
    if (
      this.canAffordBuilding(buildingType) &&
      this.buildingLimits[buildingType] > 0
    ) {
      let building = new Building(buildingType, location, this.name);
      this.buildings.push(building);
      for (let material in costDict[buildingType]) {
        this.removeResource(
          material as Resource,
          costDict[buildingType][material as Material] ?? 0
        );
      }
      this.buildingLimits[buildingType] -= 1;
      this.score += 1;
      return building;
    }
    return null;
  }

  buildRoad(edge: string) {
    return this.buildBuilding("Road", edge);
  }
}

export const costDict: {
  [key in BuildingType]: { [key in Material]?: number };
} = {
  Settlement: {
    Wood: 1,
    Wheat: 1,
    Sheep: 1,
    Brick: 1,
  },
  City: {
    Stone: 3,
    Wheat: 2,
  },
  Road: {
    Wood: 1,
    Brick: 1,
  },
};

const exampleBoard: BoardPlaceHolders[][] = [
  ["X", "X", "X", "X", "X", "X", "X", "X"],
  ["X", "#", "X", "X", "X", "#", "X", "X"],
  ["X", "#", "#", "#", "#", "#", "X", "X"],
  ["X", "#", "X", "X", "X", "#", "X", "X"],
  ["X", "#", "D", "X", "#", "#", "X", "X"],
  ["X", "#", "#", "X", "X", "#", "#", "#"],
  ["X", "X", "X", "X", "X", "X", "X", "X"],
];
