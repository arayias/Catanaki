const materials = [
  "Wood",
  "Stone",
  "Rock",
  "Wheat",
  "Sheep",
  "Brick",
  "Desert",
] as const;

export type Material = (typeof materials)[number];
export type BoardPlaceHolders = "X" | "#";
export type BuildingType = "Settlement" | "City" | "Road";

class Tile {
  land: Material | null;
  hasRobber: boolean;
  roll: number;

  constructor(material: Material | null = null, roll: number = 0) {
    this.land = material;
    this.hasRobber = material === "Desert";
    this.roll = roll;
  }
}

type Node = {
  x: string;
  y: string;
  adjacentTiles: Tile[];
  adjacentNodes: string[];
  building: Building | null;
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
        }
        rowArray.push(new Tile(chosenMaterial, roll));
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
        });
      }

      let currentNode = this.nodes.get(key)!;
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
          if (!node.adjacentNodes.includes(pointKey)) {
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

  getEdgeKey(node1: string, node2: string): string {
    return [node1, node2].sort().join("-");
  }

  serialize(): string[][] {
    let serializedBoard: string[][] = [];
    for (let row = 0; row < this.board.length; row++) {
      serializedBoard[row] = [];
      for (let col = 0; col < this.board[row].length; col++) {
        let tile = this.board[row][col];
        let material = tile.land;
        let roll = tile.roll;
        serializedBoard[row][col] = `${material} ${roll}`;
      }
    }
    return serializedBoard;
  }
}

class Building {
  buildingType: BuildingType;
  location: string;
  upgradeable: boolean;
  cost: { [key in Material]?: number };

  constructor(buildingType: BuildingType, location: string) {
    this.buildingType = buildingType;
    this.location = location;
    this.upgradeable = buildingType === "Settlement";
    this.cost = costDict[buildingType];
  }
}

export class Player {
  name: string;
  color: string;
  resources: { [key in Exclude<Material, "Desert">]: number };
  buildings: Building[];

  constructor(name: string, color: string) {
    this.name = name;
    this.color = color;
    this.resources = {
      Wood: 0,
      Stone: 0,
      Rock: 0,
      Wheat: 0,
      Sheep: 0,
      Brick: 0,
    };
    this.buildings = [];
  }

  addResource(material: Exclude<Material, "Desert">, amnt: number) {
    this.resources[material] += amnt;
  }

  removeResource(material: Exclude<Material, "Desert">, amnt: number) {
    this.resources[material] -= amnt;
  }

  canAffordBuilding(buildingType: BuildingType) {
    let cost = costDict[buildingType];
    for (let material in cost) {
      if (
        this.resources[material as Exclude<Material, "Desert">] <
        (cost[material as Material] ?? 0)
      ) {
        return false;
      }
    }
    return true;
  }

  buildBuilding(buildingType: BuildingType, location: string) {
    if (this.canAffordBuilding(buildingType)) {
      let building = new Building(buildingType, location);
      this.buildings.push(building);
      for (let material in costDict[buildingType]) {
        this.removeResource(
          material as Exclude<Material, "Desert">,
          costDict[buildingType][material as Material] ?? 0
        );
      }
      return building;
    }
    return null;
  }

  buildRoad(edge: string) {
    return this.buildBuilding("Road", edge);
  }
}

const costDict: { [key in BuildingType]: { [key in Material]?: number } } = {
  Settlement: {
    Wood: 1,
    Wheat: 1,
    Sheep: 1,
    Brick: 1,
  },
  City: {
    Rock: 3,
    Wheat: 2,
  },
  Road: {
    Wood: 1,
    Brick: 1,
  },
};

const exampleBoard: BoardPlaceHolders[][] = [
  ["X", "X", "X", "X", "X", "X", "X"],
  ["X", "X", "#", "#", "#", "X", "X"],
  ["X", "#", "#", "#", "#", "#", "X"],
  ["X", "#", "#", "#", "#", "#", "X"],
  ["X", "#", "#", "#", "#", "#", "X"],
  ["X", "X", "#", "#", "#", "X", "X"],
  ["X", "X", "X", "X", "X", "X", "X"],
];
