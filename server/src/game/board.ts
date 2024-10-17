const materials = [
  "Wood",
  "Stone",
  "Rock",
  "Wheat",
  "Sheep",
  "Brick",
  "Desert",
];

export class Board {
  board: Tile[][];
  constructor() {
    let spawnableMaterials = materials.slice(0, materials.length - 1);
    let inputBoard = exampleBoard;
    this.board = [];
    for (let row = 0; row < inputBoard.length; row++) {
      let rowArray: Tile[] = [];
      for (let col = 0; col < inputBoard[row].length; col++) {
        let material = inputBoard[row][col];
        let roll = 0;
        let chosenMaterial: Material | null = null;
        if (material === "#") {
          chosenMaterial =
            spawnableMaterials[
              Math.floor(Math.random() * spawnableMaterials.length)
            ];
        }
        rowArray.push(new Tile(chosenMaterial, roll));
      }
      this.board.push(rowArray);
    }
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

let exampleBoard: BoardPlaceHolders[][] = [
  ["X", "X", "X", "X", "X", "X", "X"],
  ["X", "#", "#", "#", "#", "X", "X"],
  ["X", "#", "#", "#", "#", "#", "X"],
  ["X", "#", "#", "#", "#", "#", "X"],
  ["X", "#", "#", "#", "#", "#", "X"],
  ["X", "#", "#", "#", "#", "#", "X"],
  ["X", "X", "X", "X", "X", "X", "X"],
];

type BoardPlaceHolders = "X" | "#";

class Tile {
  land: Material | null;
  hasRobber: boolean;
  roll: number;
  constructor(material: Material | null = null, roll: number = 0) {
    this.land = material;
    this.hasRobber = material === "Desert" ? true : false;
    this.roll = roll;
  }
}

class Player {
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
}

class Building {
  buildingType: BuildingType;
  location: Tile;
  upgradeable: boolean;
  cost: { [key in Material]?: number };

  constructor(buildingType: BuildingType, location: Tile) {
    this.buildingType = buildingType;
    this.location = location;
    this.upgradeable = buildingType === "Settlement";
    this.cost = costDict[buildingType];
  }
}

let costDict: { [key in BuildingType]: { [key in Material]?: number } } = {
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

type BuildingType = "Settlement" | "City" | "Road";

export type Material = (typeof materials)[number];
