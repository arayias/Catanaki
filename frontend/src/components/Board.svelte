<script lang="ts">
	import type { Socket } from 'socket.io-client';

	let data = $props();
	let gameId = data.id;
	let board = $derived(data.game.board);
	let nodeData = $derived(data.game.nodes);
	let validPossibleBuildingLocations = $derived(data.game.validBuildingLocations);
	let players = $derived(data.game.players);
	let name = $derived(data.uniqueName);
	let socket: Socket = data.socket;
	let selectedBuilding = $derived(data.selectedBuilding);
	let currentGameState = $derived(data.game.currentGameState);

	let brickSvg = '../brick.svg';
	let stoneSvg = '../stone.svg';
	let wheatSvg = '../wheat.svg';
	let woodSvg = '../wood.svg';
	let sheepSvg = '../sheep.svg';
	let citySvg = '../city.svg';
	let roadSvg = '../road.svg';
	let desertSvg = '../desert.svg';
	let settlementSvg = '../settlement.svg';

	let hexagons: {
		row: number;
		col: number;
		x: number;
		y: number;
		height: number;
		width: number;
		type: string;
		roll: string;
		hasRobber: boolean;
	}[] = $state([]);

	let nodes: {
		x: number;
		y: number;
		building: string;
		idx: string;
		h: number;
	}[] = $state([]);

	let nodeMap = $state(new Map());

	function getColorFromType(type: string) {
		switch (type) {
			case 'Stone':
				return '#a3a9a8';
			case 'Brick':
				return '#ec6537';
			case 'Wood':
				return '#089343';
			case 'Wheat':
				return '#d4c02f';
			case 'Sheep':
				return '#93b731';
			case 'Desert':
				return '#c79532';
			default:
				return 'lightgray';
		}
	}

	function getSvgFromResourceType(type: string) {
		switch (type) {
			case 'Stone':
				return stoneSvg;
			case 'Brick':
				return brickSvg;
			case 'Wood':
				return woodSvg;
			case 'Wheat':
				return wheatSvg;
			case 'Sheep':
				return sheepSvg;
			case 'Desert':
				return desertSvg;
			default:
				return '';
		}
	}

	function getColorFromPlayerName(name: string) {
		for (let player of players) {
			if (player.name === name) {
				return player.color;
			}
		}
		return 'lightgray';
	}

	function getSvgFromBuildingType(type: string) {
		switch (type) {
			case 'City':
				return citySvg;
			case 'Road':
				return roadSvg;
			case 'Settlement':
				return settlementSvg;
			default:
				return '';
		}
	}

	function positionHexagons() {
		const entry = document.querySelector('.game-grid');
		if (!entry) return;
		const containerWidth = entry.getBoundingClientRect().width * Math.sqrt(3) * 0.8;
		const containerHeight = ((entry.getBoundingClientRect().height * 4) / 3) * 0.8;
		const maximumWidth = Math.floor(containerWidth / board[0].length);
		const maximumHeight = Math.floor(containerHeight / board.length);
		const maxPossibleSize = maximumHeight / 2;
		const maxPossibleWidthGivenSize = maxPossibleSize * Math.sqrt(3);
		let polygonHeight;
		if (maxPossibleWidthGivenSize > maximumWidth) {
			polygonHeight = (maximumWidth / Math.sqrt(3)) * 2;
		} else {
			polygonHeight = maximumHeight;
		}
		let size = polygonHeight / 2;
		let polygonWidth = size * Math.sqrt(3);
		let margin = 0;
		let vert = (3 / 2) * size;
		let horiz = Math.sqrt(3) * size;

		const hexagonData = [];
		for (let r = 0; r < board.length; r++) {
			let horiz_offset = r % 2 == 1 ? horiz / 2 : 0;
			for (let c = 0; c < board[r].length; c++) {
				if (!board[r][c].startsWith('null')) {
					let type = board[r][c].split(' ')[0];
					let roll = board[r][c].split(' ')[1];
					let hasRobber = board[r][c].split(' ')[2];
					hexagonData.push({
						row: r,
						col: c,
						x: c * horiz + horiz_offset + margin * c,
						y: r * vert + margin * r,
						height: polygonHeight,
						width: polygonWidth,
						type: type,
						roll: roll,
						hasRobber: hasRobber === 'true'
					});
				}
			}
		}
		hexagons = hexagonData;
		nodes = positionNodes(polygonHeight, polygonWidth);
	}

	function positionNodes(height: number, width: number) {
		let nodes = [];
		let currentMap = new Map();
		let pixelSize = 12;
		let offset = pixelSize * 4;
		let yOff = (1 / 2) * height - (1 / offset) * height;
		for (let key in nodeData) {
			const building = nodeData[key];
			let [y, x] = key.split(',').map(Number);

			// currentMap.set(key, {
			// 	x: x * width - 0.77 * width,
			// 	y: y * height + yOff - 0.28 * height,
			// 	idx: key
			// });
			nodes.push({
				x: x * width + 0.445 * width,
				y: y * height + yOff,
				idx: key,
				building: building,
				h: height / pixelSize
			});
			currentMap.set(key, {
				x: x * width + 0.485 * width,
				y: y * height + yOff + 0.03 * height,
				idx: key,
				building: building,
				h: height / pixelSize
			});
		}
		nodeMap = currentMap;
		return nodes;
	}
	function getRoadOwner(from, to) {
		// Normalize road format to match both directions
		const roadKey1 = `${from}-${to}`;
		const roadKey2 = `${to}-${from}`;

		for (const player of players) {
			const hasRoad = player.buildings.some(
				(building) =>
					building.type === 'Road' &&
					(building.location === roadKey1 || building.location === roadKey2)
			);

			if (hasRoad) {
				return player.color;
			}
		}
		return 'black'; // Default color if no player owns the road
	}

	function isRoadOwned(from, to) {
		// Normalize road format to match both directions
		const roadKey1 = `${from}-${to}`;
		const roadKey2 = `${to}-${from}`;

		return players.some((player) =>
			player.buildings.some(
				(building) =>
					building.type === 'Road' &&
					(building.location === roadKey1 || building.location === roadKey2)
			)
		);
	}

	const allowedRoads = $derived.by(() => {
		let current = [];
		for (let player of players) {
			if (player.name === data.game.currentPlayer) {
				for (let building of player.buildings) {
					if (nodeMap.has(building.location)) {
						// get adjacencts
						// console.log(`checking if ${building.location} has adjacent`);
						let adjacent = data.game.edges[building.location];
						for (let neighbor of adjacent) {
							if (nodeMap.has(neighbor)) {
								current.push([building.location, neighbor]);
							}
						}
					} else if (building.type === 'Road') {
						let [from, to] = building.location.split('-');
						for (let neighbor of data.game.edges[from]) {
							if (nodeMap.has(neighbor)) {
								current.push([from, neighbor]);
							}
						}
						for (let neighbor of data.game.edges[to]) {
							if (nodeMap.has(neighbor)) {
								current.push([neighbor, to]);
							}
						}
					}
				}
			}
		}
		return current;
	});

	function isAllowedRoad(parent, node) {
		return allowedRoads.some(
			(road) => (road[0] === parent && road[1] === node) || (road[0] === node && road[1] === parent)
		);
	}

	$effect(() => {
		positionHexagons();
		window.addEventListener('resize', positionHexagons);
		return () => window.removeEventListener('resize', positionHexagons);
	});
</script>

<div id="board" class="relative bg-blue-500">
	<div class="">
		{#each hexagons as hex}
			{@const isDesert = hex.type === 'Desert'}
			<button
				class="polygon {currentGameState !== 'robber' ? 'pointer-events-none' : ''} absolute"
				data-row={hex.row}
				data-col={hex.col}
				data-roll={hex.roll}
				style="height: {hex.height}px; top: {hex.y}px; left: {hex.x}px; background-color: {getColorFromType(
					hex.type
				)};"
				onclick={() => {
					console.log(`(${hex.row}, ${hex.col})`);
					if (currentGameState === 'robber') {
						socket.emit(
							'game command',
							JSON.stringify({
								type: 'robber',
								sender: data.uniqueName,
								location: `${hex.row},${hex.col}`
							})
						);
					}
				}}
				onkeydown={(e) => e.key === 'Enter' && console.log(`(${hex.row}, ${hex.col})`)}
				aria-label={`Hexagon at row ${hex.row}, column ${hex.col}`}
			>
				<div class="relative flex flex-col items-center justify-center">
					<div>
						<img
							class="aspect-square"
							src={getSvgFromResourceType(hex.type)}
							alt={hex.type}
							style="height: {hex.height / 4}px "
						/>
						{#if hex.hasRobber}
							<img
								src="/robber.svg"
								alt="Robber"
								class="absolute top-0"
								style="left: {hex.width / 10}px; top: 0px; height: {hex.height /
									4}px; width:{hex.height / 4}px;"
							/>
						{:else if currentGameState === 'robber'}
							<!-- add clickable indicator instead of img -->
							<div
								alt="Robber"
								class="absolute top-0 animate-pulse rounded-full bg-slate-200"
								style="left: {hex.width / 10}px; top: 0px; height: {hex.height /
									6}px; width:{hex.height / 6}px;"
							></div>
						{/if}
					</div>
					{#if !isDesert}
						<div
							class="flex aspect-square flex-col items-center justify-center rounded-full bg-slate-200 p-0.5"
						>
							<span
								class={`text-sm font-bold ${hex.roll === '6' || hex.roll === '8' ? 'text-red-600' : 'text-blue-950'}`}
							>
								{hex.roll}
							</span>
						</div>
					{/if}
				</div>
			</button>
		{/each}
		{#each nodes as node}
			{#if node.building == false || node.building === 'never' || node.building === true}
				{#if validPossibleBuildingLocations?.includes(node.idx) && selectedBuilding === 'settlement'}
					<button
						class="node absolute aspect-square animate-pulse rounded-full border-2 border-slate-300 bg-gray-600 p-1"
						data-idx={node.idx}
						style="top: {node.y}px; left: {node.x -
							node.h * 0.25}px; height: {node.h}px; z-index: 4;"
						onclick={() => {
							console.log(`(${node.idx})`);
							socket.emit(
								'game command',
								JSON.stringify({
									type: data.game.initialPlacement ? 'initialPlacement' : 'build',
									building: 'Settlement',
									location: node.idx,
									sender: data.uniqueName
								})
							);
						}}
					/>
				{/if}
			{:else if node.building != true}
				<button
					class="node absolute aspect-square rounded-full border-2 border-slate-800 p-1 {node
						.building.buildingType === 'Settlement'
						? 'settlement'
						: 'city'}"
					data-idx={node.idx}
					style="top: {node.y - node.h * 1.5}px; left: {node.x - node.h * 1.4}px; height: {node.h *
						4}px; background-color:{getColorFromPlayerName(node.building.owner)}; z-index: 4;"
					onclick={() => {
						if (selectedBuilding !== 'city') {
							return;
						}
						console.log(`(${node.idx})`);
						socket.emit(
							'game command',
							JSON.stringify({
								type: 'upgrade',
								location: node.idx,
								sender: data.uniqueName
							})
						);
					}}
				>
					<div class="relative flex flex-col items-center justify-center">
						{#if node.building !== null}
							<div class="aspect-square p-1">
								<img
									class="aspect-square object-contain"
									src={getSvgFromBuildingType(node.building.buildingType)}
									alt={node.building.buildingType}
								/>
							</div>
						{/if}
						{#if selectedBuilding === 'city' && node.building.buildingType !== 'City' && node.building.owner === data.game.currentPlayer}
							<div class="absolute left-0 top-0 h-full w-full">
								<div
									class="aspect-square animate-pulse rounded-full bg-slate-200 p-2 opacity-10"
								></div>
							</div>
						{/if}
					</div>
				</button>
			{/if}
		{/each}

		{#each Object.entries(data.game.edges) as [parent, edge]}
			{#each edge as node}
				<svg
					class="absolute"
					data-parent={parent}
					data-neighbor={node}
					style="top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: {isRoadOwned(
						parent,
						node
					)
						? 3
						: 2}"
					preserveAspectRatio="none"
				>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					{#if nodeMap.get(parent) && nodeMap.get(node)}
						{@const owned = isRoadOwned(parent, node)}
						{@const allowed = isAllowedRoad(parent, node)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<line
							x1={nodeMap.get(parent).x}
							y1={nodeMap.get(parent).y}
							x2={nodeMap.get(node).x}
							y2={nodeMap.get(node).y}
							stroke={owned
								? getRoadOwner(parent, node)
								: allowed && selectedBuilding === 'road'
									? 'lightgray'
									: 'black'}
							stroke-width={(allowed && selectedBuilding === 'road') || owned ? 10 : 3}
							stroke-linecap="round"
							class={allowed && selectedBuilding === 'road' && !owned ? 'potential-road' : ''}
							stroke-dasharray={allowed && selectedBuilding === 'road' ? '10,5' : 'none'}
							style="pointer-events: auto;"
							onclick={() => {
								console.log('parent, node', parent, node);
								if (allowed && selectedBuilding === 'road') {
									socket.emit(
										'game command',
										JSON.stringify({
											type: 'buildRoad',
											sender: data.uniqueName,
											edge: [parent, node].sort().join('-')
										})
									);
								}
							}}
						/>
					{/if}
				</svg>
			{/each}
		{/each}
	</div>
</div>

<style>
	.polygon {
		position: absolute;
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
	}
	.node {
		position: absolute;
	}
	@keyframes roadFade {
		0% {
			opacity: 1;
			stroke-dashoffset: 0;
		}
		100% {
			opacity: 0.4;
			stroke-dashoffset: 300;
		}
	}

	.potential-road {
		animation: roadFade 1.5s ease-in-out infinite alternate;
	}
</style>
