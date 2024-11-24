<script lang="ts">
	import { page } from '$app/stores';
	import axios from 'axios';
	import Board from '../../../components/Board.svelte';
	import { io, Socket } from 'socket.io-client';
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';

	const id = $page.params.id;
	let connected = $state(false);
	let uniqueName = $state('');
	let selectedBuilding = $state('');
	let allowedBuildings = ['settlement', 'city', 'road'];
	type Building = 'settlement' | 'city' | 'road';
	type Material = 'Wood' | 'Brick' | 'Wheat' | 'Sheep' | 'Stone';
	let allowedMaterials = ['Wood', 'Brick', 'Wheat', 'Sheep', 'Stone'];

	let deselectedMaterials: Record<Material, number> = $state({
		Wood: 0,
		Brick: 0,
		Wheat: 0,
		Sheep: 0,
		Stone: 0
	});

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
	{#snippet materialCard(material: string, amount: number, increment: boolean)}
		<button
			class="flex w-[10%] flex-col items-center space-y-2 rounded-lg bg-slate-400 p-1
    transition-transform hover:bg-blue-500 active:scale-95"
			onclick={() => {
				if (increment) {
					deselectedMaterials[material] = Math.min(deselectedMaterials[material] + 1, amount);
				} else {
					deselectedMaterials[material] = Math.max(deselectedMaterials[material] - 1, 0);
				}
			}}
		>
			<img src={getSvgFromResourceType(material)} alt={material} class="h-4 w-4" />
			{#key deselectedMaterials[material]}
				<span in:scale={{ duration: 500, start: 0.8 }} class="font-bold">
					{amount}
				</span>
			{/key}
		</button>
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
					{#if game.roll > 0}
						<p class="text-3xl font-bold">
							🎲 {game.roll}
						</p>
					{/if}

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
					</div>
				{/each}
			</div>
			<!--  bottom row -->
			{#if game.hasStarted}
				{@const shouldDiscard =
					game.waitingForDiscard && game.waitingForDiscard.hasOwnProperty(uniqueName)}
				<div class="flex flex-row bg-slate-200">
					<div class="flex flex-grow flex-col">
						<div class="flex flex-row gap-5 p-3">
							{#each allowedMaterials as material}
								{@render materialCard(material, deselectedMaterials[material], false)}
							{/each}
						</div>
						<div class="flex flex-row gap-5 p-3">
							{#each allowedMaterials as material}
								{@const player = game.players.find((p) => p.name === uniqueName)}
								{@render materialCard(material, player?.resources[material], true)}
							{/each}
						</div>
					</div>
					<button
						class="rounded bg-green-500 px-4 py-2 font-bold text-white hover:bg-green-700"
						onclick={() => {
							let amountToDiscard = Object.values(deselectedMaterials).reduce(
								(acc, curr) => acc + curr,
								0
							);

							let expected = game.waitingForDiscard?.[uniqueName] ?? 0;

							console.log('amountToDiscard', amountToDiscard);
							console.log('expected', expected);

							if (amountToDiscard !== expected) {
								alert(`You need to discard ${expected} resources`);
								return;
							}

							socket!.emit(
								'game command',
								JSON.stringify({
									type: 'discardResources',
									sender: uniqueName,
									resources: deselectedMaterials
								})
							);
							// clear deselected materials
							deselectedMaterials = {
								Wood: 0,
								Brick: 0,
								Wheat: 0,
								Sheep: 0,
								Stone: 0
							};
						}}
					>
						{game.currentGameState == 'discardResouces' ? 'Discard' : 'Trade'}
					</button>
				</div>
				{#if game.currentPlayer === uniqueName}
					{@const canEndTurn = game.currentGameState == 'normal'}
					<button
						class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 {canEndTurn
							? ''
							: 'bg-gray-500'}"
						onclick={() => {
							if (!canEndTurn) return;
							socket!.emit(
								'game command',
								JSON.stringify({ type: 'rollDice', sender: uniqueName })
							);
							selectedBuilding = '';
						}}
					>
						End Turn
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
