<script lang="ts">
	import { page } from '$app/stores';
	import axios from 'axios';
	import Board from '../../../components/Board.svelte';
	import { io, Socket } from 'socket.io-client';
	import { onMount } from 'svelte';

	const id = $page.params.id;
	let connected = $state(false);
	let uniqueName = $state('');
	let selectedBuilding = $state('');
	let allowedBuildings = ['settlement', 'city', 'road'];
	let allowedMaterials = ['Wood', 'Brick', 'Wheat', 'Sheep', 'Stone'];

	const getGame = async () => {
		const response = await axios.get(`http://localhost:3001/game/${id}`);
		return response.data;
	};

	const handleSelectBuilding = (building: string) => () => {
		if (selectedBuilding === building) {
			selectedBuilding = '';
			return;
		}
		selectedBuilding = building;
	};

	let brickSvg = '../brick.svg';
	let stoneSvg = '../stone.svg';
	let wheatSvg = '../wheat.svg';
	let woodSvg = '../wood.svg';
	let sheepSvg = '../sheep.svg';

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
			default:
				return '';
		}
	}

	let socket: Socket | null = $state(null);
	let game: any = $state(new Promise(() => {}));

	onMount(() => {
		game = getGame();
		uniqueName = localStorage.getItem('unique_name') ?? 'null';
		if (!uniqueName) {
			let name = Math.random().toString(36).substring(7);
			localStorage.setItem('unique_name', name);
			uniqueName = name;
		}
		socket = io('http://localhost:3001');
		if (socket) {
			socket.on('connect', () => {
				connected = true;
				socket!.on('disconnect', () => {
					connected = false;
				});
			});

			socket.emit('join game', id);
			socket.emit('create player', uniqueName);

			socket.on('game update', (data) => {
				console.log('game update', data);
				game = data;
				game.roll = data.roll;
				if (game.currentPlayer === uniqueName) {
					if (game.currentGameState === 'initialPlacementSettlement') {
						selectedBuilding = 'settlement';
					}
					if (game.currentGameState === 'initialPlacementRoad') {
						selectedBuilding = 'road';
					}
				}
				if (game.winner) {
					// drop the game
					socket!.disconnect();
				}
			});
		}
	});

	$effect(() => {
		let el = document.querySelectorAll(`[data-roll="${game.roll ?? 0}"]`);
		for (let i = 0; i < el.length; i++) {
			el[i].classList.add('animate-pulse');
		}

		return () => {
			for (let i = 0; i < el.length; i++) {
				el[i].classList.remove('animate-pulse');
			}
		};
	});
</script>

<div class="entry">
	{#snippet materialCard(material: string, amount: number)}
		<div
			class="flex w-[10%] flex-col items-center space-y-2 rounded-lg bg-slate-400 p-1
		hover:bg-blue-500"
		>
			<img src={getSvgFromResourceType(material)} alt={material} class="h-4 w-4" />
			<span>{amount}</span>
		</div>
	{/snippet}

	{#await game}
		<p>Loading...</p>
	{:then game}
		<div class="game-grid">
			{#if game.winner}
				<div
					class="game-over absolute left-[50%] top-[50%] z-20 translate-x-[-80%] translate-y-[-80%] transform rounded-lg bg-slate-200 p-5"
				>
					<div class="flex flex-col items-center justify-center">
						<span class="text-3xl font-bold">
							{game.winner.name} wins!
						</span>
						<span class="text-xl font-bold">
							{game.winner.score} points
						</span>
					</div>
				</div>
			{/if}
			<Board {game} {socket} {uniqueName} {selectedBuilding} />
			<div class="flex flex-col items-center justify-center bg-slate-200 p-5">
				<div>state: {game.currentGameState}</div>
				<div>
					<!-- {connectedPlayers} -->
					{#if connected}
						<span class="animate-pulse">🟢</span>
					{:else}
						<span class="animate-pulse">🔴</span>
					{/if}
				</div>
				<p>{connected ? 'Connected' : 'Disconnected'}</p>
				{#if !game.hasStarted}
					<button
						class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
						onclick={() => {
							socket!.emit('start game');
						}}
					>
						Start game
					</button>
				{/if}
				{#if game.hasStarted}
					<p class="text-3xl font-bold">
						🎲 {game.roll}
					</p>

					{#if game.currentPlayer === uniqueName}
						<div class="flex flex-col items-center justify-center bg-slate-200 p-5">
							{#each allowedBuildings as building}
								{@const key = building.slice(0, 1).toUpperCase() + building.slice(1)}
								{@const amount =
									game.players.find((p) => p.name === uniqueName)?.buildingLimits[key] ?? 0}
								<button
									class="flex flex-col items-center space-x-2 rounded-lg p-1 {selectedBuilding ===
									building
										? amount > 0
											? 'bg-blue-500'
											: 'bg-yellow-500'
										: ''}"
									onclick={handleSelectBuilding(building)}
								>
									<img src={`/${building}.svg`} alt={building} class="h-4 w-4" />
									<span class="text-sm font-bold">
										{key}
										{game.players.find((p) => p.name === uniqueName)?.buildingLimits[key] ?? 0}
									</span>
									<span> </span>
								</button>
							{/each}
						</div>
					{/if}
				{/if}
				{#each game.players as player}
					<div
						class="mt-1 flex w-full items-center justify-center rounded-lg border-r-[2rem] p-2 {player.name ===
						game.currentPlayer
							? 'bg-blue-500'
							: 'bg-slate-300'}
						"
						style="border-color: {player.color}"
					>
						{player.name} ({player.score})
						{#if player.name === game.longestRoadPlayer?.name}
							<img src="/road.svg" alt="Road" class="h-4 w-4" />
							{game.longestRoad}
						{/if}
						<!-- <div class="text-sm font-bold text-black">
							Materials
							<div class="flex space-x-2">
								{#if player.resources.Wood > 0}
									<div class="flex items-center">
										{player.resources.Wood}
										<img src="/wood.svg" alt="Wood" class="h-4 w-4" />
									</div>
								{/if}
								{#if player.resources.Brick > 0}
									<div class="flex items-center">
										{player.resources.Brick}
										<img src="/brick.svg" alt="Brick" class="h-4 w-4" />
									</div>
								{/if}
								{#if player.resources.Wheat > 0}
									<div class="flex items-center">
										{player.resources.Wheat}
										<img src="/wheat.svg" alt="Wheat" class="h-4 w-4" />
									</div>
								{/if}
								{#if player.resources.Sheep > 0}
									<div class="flex items-center">
										{player.resources.Sheep}
										<img src="/sheep.svg" alt="Sheep" class="h-4 w-4" />
									</div>
								{/if}
								{#if player.resources.Stone > 0}
									<div class="flex items-center">
										{player.resources.Stone}
										<img src="/stone.svg" alt="Stone" class="h-4 w-4" />
									</div>
								{/if}
							</div>
						</div> -->
					</div>
				{/each}
			</div>
			<!--  bottom row -->
			{#if game.hasStarted}
				<div class="flex items-center justify-center gap-5 bg-slate-200 p-5">
					<div class="flex items-center justify-center"></div>
					{#each allowedMaterials as material}
						{@const player = game.players.find((p) => p.name === uniqueName)}
						{@render materialCard(material, player?.resources[material])}
					{/each}
				</div>
				{#if game.currentPlayer === uniqueName}
					<button
						class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
						onclick={() => {
							socket!.emit(
								'game command',
								JSON.stringify({ type: 'rollDice', sender: uniqueName })
							);
							selectedBuilding = '';
						}}
					>
						End turn
					</button>
				{:else}
					<button class="rounded bg-yellow-500 px-4 py-2 font-bold text-white">
						Waiting for {game.currentPlayer}
					</button>
				{/if}
			{/if}
		</div>
	{:catch error}
		<p>{error.message}</p>
	{/await}
</div>
