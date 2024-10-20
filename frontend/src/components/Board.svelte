<script lang="ts">
	let data = $props();
	let gameId = data.id;
	let board = data.board;

	console.log(board);
	let brickSvg = '../../brick.svg';
	let stoneSvg = '../../stone.svg';
	let wheatSvg = '../../wheat.svg';
	let woodSvg = '../../wood.svg';
	let sheepSvg = '../../sheep.svg';

	let hexagons: {
		row: number;
		col: number;
		x: number;
		y: number;
		height: number;
		type: string;
		roll: string;
	}[] = $state([]);

	function getColorFromType(type: string) {
		console.log('getColorFromType', type);
		switch (type) {
			case 'Stone':
				return '#a3a9a8';
			case 'Brick':
				return '#ec6537';
			case 'Wood':
				return '#089343';
			case 'Wheat':
				return '#fbbc3f';
			case 'Sheep':
				return '#93b731';
			default:
				return 'lightgray';
		}
	}

	function getSvgFromType(type: string) {
		console.log('getSvgFromType', type);
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
			default:
				return '';
		}
	}

	function positionHexagons() {
		console.log('positionHexagons');
		const entry = document.querySelector('.entry');
		if (!entry) return;
		const containerWidth = entry.getBoundingClientRect().width * Math.sqrt(3);
		const containerHeight = (entry.getBoundingClientRect().height * 4) / 3;
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
		// let polygonWidth = size * Math.sqrt(3);
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
					hexagonData.push({
						row: r,
						col: c,
						x: c * horiz + horiz_offset + margin * c,
						y: r * vert + margin * r,
						height: polygonHeight,
						type: type,
						roll: roll
					});
				}
			}
		}
		hexagons = hexagonData;
	}
	$effect(() => {
		positionHexagons();
		window.addEventListener('resize', positionHexagons);
		return () => window.removeEventListener('resize', positionHexagons);
	});
</script>

<div id="board" class="entry">
	{#each hexagons as hex}
		<button
			class="polygon absolute"
			data-row={hex.row}
			data-col={hex.col}
			style="height: {hex.height}px; top: {hex.y}px; left: {hex.x}px; background-color: {getColorFromType(
				hex.type
			)};"
			onclick={() => console.log(`(${hex.row}, ${hex.col})`)}
			onkeydown={(e) => e.key === 'Enter' && console.log(`(${hex.row}, ${hex.col})`)}
			aria-label={`Hexagon at row ${hex.row}, column ${hex.col}`}
		>
			<div class="flex flex-col items-center justify-center">
				<div>
					<img
						class="aspect-square"
						src={getSvgFromType(hex.type)}
						alt={hex.type}
						style="height: {hex.height / 4}px "
					/>
				</div>
				<div>
					<span class="text-xs font-bold text-purple-100">
						{hex.roll}
					</span>
				</div>
			</div>
		</button>
	{/each}
</div>

<style>
	.polygon {
		position: absolute;
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
	}
</style>
