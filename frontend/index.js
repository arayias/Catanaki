console.log('hello world');
const sampleInput = [
	['null', 'null', 'null', 'null', 'null', 'null', 'null'],
	['null', 'null', '#', '#', '#', 'null', 'null'],
	['null', '#', '#', '#', '#', '#', 'null'],
	['null', '#', '#', '#', '#', '#', 'null'],
	['null', '#', '#', '#', '#', '#', 'null'],
	['null', 'null', '#', '#', '#', 'null', 'null'],
	['null', 'null', 'null', 'null', 'null', 'null', 'null']
];
// const base_url = 'https://catanaki-production.up.railway.app/';
const base_url = 'http://localhost:3000/';
const game = await fetch(`${base_url}/game`, {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	}
});
let gameJson = await game.json();
// gameJson.gameId = "ijmmcq";

var socket = io.connect(`ws://${base_url}`);
socket.emit('join game', `${gameJson.gameId}`);
socket.emit('start game', `${gameJson.gameId}`);

socket.on('game update', (data) => {
	for (let i = 0; i < data.players.length; i++) {
		for (let j = 0; j < data.players[i].buildings.length; j++) {
			let location = data.players[i].buildings[j].location;
			location = location.split(',');
			console.log(location);
			let node = document.querySelector(`[data-row="${location[0]}"][data-col="${location[1]}"]`);
			node.style.backgroundColor = data.players[i].color;
		}
	}
});

const nodeCreationData = [
	{ y: 1.25, x: 2.5 },
	{ y: 0.25, x: 2.5 },
	{ y: 0.5, x: 3.0 },
	{ y: 0.5, x: 2.0 },
	{ y: 1.0, x: 2.0 },
	{ y: 1.0, x: 3.0 },
	{ y: 1.25, x: 3.5 },
	{ y: 0.25, x: 3.5 },
	{ y: 0.5, x: 4.0 },
	{ y: 1.0, x: 4.0 },
	{ y: 1.25, x: 4.5 },
	{ y: 0.25, x: 4.5 },
	{ y: 0.5, x: 5.0 },
	{ y: 1.0, x: 5.0 },
	{ y: 2.0, x: 1.0 },
	{ y: 1.0, x: 1.0 },
	{ y: 1.25, x: 1.5 },
	{ y: 1.25, x: 0.5 },
	{ y: 1.75, x: 0.5 },
	{ y: 1.75, x: 1.5 },
	{ y: 2.0, x: 2.0 },
	{ y: 1.75, x: 2.5 },
	{ y: 2.0, x: 3.0 },
	{ y: 1.75, x: 3.5 },
	{ y: 2.0, x: 4.0 },
	{ y: 1.75, x: 4.5 },
	{ y: 2.0, x: 5.0 },
	{ y: 1.25, x: 5.5 },
	{ y: 1.75, x: 5.5 },
	{ y: 2.75, x: 1.5 },
	{ y: 2.5, x: 1.0 },
	{ y: 2.5, x: 2.0 },
	{ y: 2.75, x: 2.5 },
	{ y: 2.5, x: 3.0 },
	{ y: 2.75, x: 3.5 },
	{ y: 2.5, x: 4.0 },
	{ y: 2.75, x: 4.5 },
	{ y: 2.5, x: 5.0 },
	{ y: 2.75, x: 5.5 },
	{ y: 2.0, x: 6.0 },
	{ y: 2.5, x: 6.0 },
	{ y: 3.5, x: 1.0 },
	{ y: 2.75, x: 0.5 },
	{ y: 3.25, x: 0.5 },
	{ y: 3.25, x: 1.5 },
	{ y: 3.5, x: 2.0 },
	{ y: 3.25, x: 2.5 },
	{ y: 3.5, x: 3.0 },
	{ y: 3.25, x: 3.5 },
	{ y: 3.5, x: 4.0 },
	{ y: 3.25, x: 4.5 },
	{ y: 3.5, x: 5.0 },
	{ y: 3.25, x: 5.5 },
	{ y: 4.25, x: 2.5 },
	{ y: 4.0, x: 2.0 },
	{ y: 4.0, x: 3.0 },
	{ y: 4.25, x: 3.5 },
	{ y: 4.0, x: 4.0 },
	{ y: 4.25, x: 4.5 },
	{ y: 4.0, x: 5.0 }
];

const entry = document.querySelector('.entry');

function positionHexagons() {
	const containerWidth = entry.getBoundingClientRect().width * Math.sqrt(3);
	const containerHeight = (entry.getBoundingClientRect().height * 4) / 3;
	const maximumWidth = Math.floor(containerWidth / sampleInput[0].length);
	const maximumHeight = Math.floor(containerHeight / sampleInput.length);
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
	entry.innerHTML = '';
	for (let r = 0; r < sampleInput.length; r++) {
		let horiz_offset = r % 2 == 1 ? horiz / 2 : 0;
		for (let c = 0; c < sampleInput[r].length; c++) {
			if (sampleInput[r][c] !== 'null') {
				const poly = document.createElement('div');
				poly.classList.add('polygon');
				poly.dataset.row = r;
				poly.dataset.col = c;
				poly.style.height = `${polygonHeight}px`;
				poly.addEventListener('click', () => {
					console.log(`(${r}, ${c})`);
				});

				let x = c * horiz + horiz_offset + margin * c;
				let y = r * vert + margin * r;
				poly.style.transform = `translate(${x}px, ${y}px)`;

				entry.appendChild(poly);
			}
		}
	}
	renderNodes(polygonHeight, polygonWidth);
}

function renderNodes(height, width) {
	let pixelSize = 10;
	let offset = pixelSize * 2;
	let yOff = (1 / 2) * height - (1 / offset) * height;
	for (let i = 0; i < nodeCreationData.length; i++) {
		const node = document.createElement('div');
		node.classList.add('node');
		node.style.height = `${height / pixelSize}px`;
		node.style.aspectRatio = '1/1';
		node.style.borderRadius = '50%';
		node.style.backgroundColor = 'gray';
		node.style.opacity = '0.8';
		node.style.position = 'absolute';
		node.style.transform = `translate(${nodeCreationData[i].x * width}px, ${
			nodeCreationData[i].y * height + yOff
		}px)`;
		node.dataset.row = nodeCreationData[i].y.toFixed(2);
		node.dataset.col = nodeCreationData[i].x.toFixed(2);
		node.addEventListener('click', () => {
			console.log(`(${nodeCreationData[i].y}, ${nodeCreationData[i].x})`);
			socket.emit(
				'game command',
				JSON.stringify({
					type: 'build',
					sender: 'alice',
					location: `${nodeCreationData[i].y.toFixed(2)},${nodeCreationData[i].x.toFixed(2)}`,
					building: 'Settlement'
				})
			);
		});
		entry.appendChild(node);
	}
}

positionHexagons();

window.addEventListener('resize', positionHexagons);
