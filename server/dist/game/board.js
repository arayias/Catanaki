"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.costDict = exports.Player = exports.Board = void 0;
const materials = [
    "Wood",
    "Stone",
    "Wheat",
    "Sheep",
    "Brick",
    "Desert",
];
class Tile {
    constructor(material = null, roll = 0) {
        this.land = material;
        this.hasRobber = false;
        this.roll = roll;
        this.nodes = [];
    }
}
class Board {
    constructor() {
        this.spawnableMaterials = materials.slice(0, materials.length - 1);
        this.inputBoard = exampleBoard;
        this.board = this.constructBoard();
        this.nodes = new Map();
        this.edges = new Map();
        this.initializeNodesAndEdges();
    }
    constructBoard() {
        let board = [];
        let lastDesertTile = null;
        for (let row = 0; row < this.inputBoard.length; row++) {
            let rowArray = [];
            for (let col = 0; col < this.inputBoard[row].length; col++) {
                let material = this.inputBoard[row][col];
                let roll = 0;
                let chosenMaterial = null;
                if (material === "#") {
                    chosenMaterial =
                        this.spawnableMaterials[Math.floor(Math.random() * this.spawnableMaterials.length)];
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
    createNodesForTile(row, col) {
        let tile = this.board[row][col];
        if (tile.land == null)
            return;
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
            let currentNode = this.nodes.get(key);
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
                    if (!node.adjacentNodes.includes(pointKey) &&
                        this.hasACommonAdjacentMaterialTile(row, col, point[0], point[1])) {
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
    hasACommonAdjacentMaterialTile(row1, col1, row2, col2) {
        const node1 = this.nodes.get(`${row1.toFixed(2)},${col1.toFixed(2)}`);
        const node2 = this.nodes.get(`${row2.toFixed(2)},${col2.toFixed(2)}`);
        if (!node1 || !node2)
            return false;
        for (let tile of node1.adjacentTiles) {
            for (let otherTile of node2.adjacentTiles) {
                if (tile === otherTile)
                    return true;
            }
        }
        return false;
    }
    getEdgeKey(node1, node2) {
        return [node1, node2].sort().join("-");
    }
    serializeBoard() {
        let serializedBoard = [];
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
        let serializedNodes = {};
        for (let [key, node] of this.nodes) {
            if (node.building) {
                serializedNodes[key] = node.building;
            }
            else {
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
        let adjacencyList = {};
        for (let [key, node] of this.nodes) {
            adjacencyList[key] = [];
            for (let neighbor of node.adjacentNodes) {
                adjacencyList[key].push(neighbor);
            }
            adjacencyList[key] = adjacencyList[key].sort();
        }
        return adjacencyList;
    }
    moveRobber(location) {
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
    canStealFromPlayer(player) {
        if (!this?.robberTile || !this.robberTile?.nodes)
            return false;
        for (let node of this.robberTile.nodes) {
            if (node.building?.owner === player.name) {
                return true;
            }
        }
        return false;
    }
}
exports.Board = Board;
class Building {
    constructor(buildingType, location, owner) {
        this.buildingType = buildingType;
        this.location = location;
        this.upgradeable = buildingType === "Settlement";
        this.cost = exports.costDict[buildingType];
        this.owner = owner;
    }
}
class Player {
    constructor(name) {
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
    addResource(material, amnt) {
        this.resources[material] += amnt;
    }
    removeResource(material, amnt) {
        this.resources[material] -= amnt;
    }
    stealRandomResource() {
        let resources = Object.keys(this.resources);
        let filteredRandomResources = resources.filter((resource) => this.resources[resource] > 0);
        let random = Math.floor(Math.random() * filteredRandomResources.length);
        let stolenResource = filteredRandomResources[random];
        this.resources[stolenResource] -= 1;
        return stolenResource;
    }
    getTotalResources() {
        return Object.values(this.resources).reduce((a, b) => a + b);
    }
    canAffordBuilding(buildingType) {
        let cost = exports.costDict[buildingType];
        for (let material in cost) {
            if (this.resources[material] < (cost[material] ?? 0)) {
                return false;
            }
        }
        return true;
    }
    buildBuilding(buildingType, location) {
        if (this.canAffordBuilding(buildingType) &&
            this.buildingLimits[buildingType] > 0) {
            let building = new Building(buildingType, location, this.name);
            this.buildings.push(building);
            for (let material in exports.costDict[buildingType]) {
                this.removeResource(material, exports.costDict[buildingType][material] ?? 0);
            }
            if (buildingType !== "Road") {
                this.score += 1;
            }
            this.buildingLimits[buildingType] -= 1;
            return building;
        }
        return null;
    }
    upgradeBuilding(buildingType, location) {
        if (this.canAffordBuilding(buildingType) &&
            this.buildingLimits[buildingType] > 0) {
            let building = new Building(buildingType, location, this.name);
            this.buildings.push(building);
            for (let material in exports.costDict[buildingType]) {
                this.removeResource(material, exports.costDict[buildingType][material] ?? 0);
            }
            this.buildingLimits[buildingType] -= 1;
            this.score += 1;
            return building;
        }
        return null;
    }
    buildRoad(edge) {
        return this.buildBuilding("Road", edge);
    }
}
exports.Player = Player;
exports.costDict = {
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
const exampleBoard = [
    ["X", "X", "X", "X", "X", "X", "X", "X"],
    ["X", "#", "X", "X", "X", "#", "X", "X"],
    ["X", "#", "#", "#", "#", "#", "X", "X"],
    ["X", "#", "X", "X", "X", "#", "X", "X"],
    ["X", "#", "D", "X", "#", "#", "X", "X"],
    ["X", "#", "#", "X", "X", "#", "#", "#"],
    ["X", "X", "X", "X", "X", "X", "X", "X"],
];
