<script lang="ts">
	import { page } from '$app/stores';
	import axios from 'axios';
	import Board from '../../../components/Board.svelte';
	import { io, Socket } from 'socket.io-client';
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import MaterialCostTooltip from '$components/MaterialCostTooltip.svelte';
	import { toast } from '@zerodevx/svelte-toast';

	// const base_url = 'http://localhost:3001';
	const base_url = 'https://catanaki-production.up.railway.app';

	const id = $page.params.id;
	let connected = $state(false);
	let uniqueName = $state('');
	let selectedBuilding = $state('');
	let allowedBuildings = ['settlement', 'city', 'road'];
	let trading = $state(false);

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

	let selectedMaterials: Record<Material, number> = $state({
		Wood: 0,
		Brick: 0,
		Wheat: 0,
		Sheep: 0,
		Stone: 0
	});

	const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

	let totalDeselected = $derived(
		Object.values(deselectedMaterials).reduce((acc, curr) => acc + curr, 0)
	);

	const getGame = async () => {
		const response = await axios.get(`${base_url}/game/${id}`);
		return response.data;
	};
	const getPlayer = (game: any) => game?.players?.find((p: any) => p.name === uniqueName);

	const canAfford = (building: Building, game: any) => {
		let cost = game.costDict[building];
		let player = getPlayer(game);
		for (let resource in cost) {
			if (player.resources[resource] < cost[resource]) {
				return false;
			}
		}
		return true;
	};

	const handleSelectBuilding = (building: string, game: any) => () => {
		if (selectedBuilding === building) {
			selectedBuilding = '';
			return;
		}
		if (game.currentGameState === 'normal' && !canAfford(capitalize(building) as Building, game)) {
			return;
		}
		selectedBuilding = building;
	};

	let resourceToSvg = {
		Brick: '../brick.svg',
		Stone: '../stone.svg',
		Wheat: '../wheat.svg',
		Wood: '../wood.svg',
		Sheep: '../sheep.svg'
	};

	let socket: Socket | null = $state(null);
	let game: any = $state(new Promise(() => {}));
	let prevState = $state({});

	onMount(() => {
		game = getGame();
		uniqueName = localStorage.getItem('unique_name') ?? 'null';
		if (!uniqueName) {
			let name = Math.random().toString(36).substring(7);
			localStorage.setItem('unique_name', name);
			uniqueName = name;
		}
		socket = io(base_url);
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
				prevState = game;
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

	let currentMaterials = $derived(getPlayer(game)?.resources);
	let prevMaterials = $derived(getPlayer(prevState)?.resources);
	let materialDiff = $derived.by(() => {
		let diff = {};
		if (!currentMaterials || !prevMaterials) {
			return diff;
		}
		for (let material in currentMaterials) {
			diff[material] = currentMaterials[material] - prevMaterials[material];
		}
		return diff;
	});

	$effect(() => {
		if (!materialDiff) {
			return;
		}
		for (let material in materialDiff) {
			let diff = materialDiff[material];
			let sign = diff > 0 ? '+' : '';
			if (diff === 0) {
				continue;
			}
			toast.push(`${sign} ${diff} ${material}`);
		}
	});
</script>

<div class="entry">
	{#snippet materialCard(
		material: Material,
		amount: number,
		increment: boolean,
		dict: Record<Material, number>
	)}
		<button
			class="flex w-[10%] flex-col items-center space-y-2 rounded-lg bg-slate-400 p-1
			transition-transform hover:bg-blue-500 active:scale-95"
			onclick={() => {
				if (game.currentGameState !== 'discardResouces' && !trading) {
					return;
				}
				if (increment) {
					dict[material] = Math.min(dict[material] + 1, amount);
				} else {
					dict[material] = Math.max(dict[material] - 1, 0);
				}
			}}
		>
			<img src={resourceToSvg[material]} alt={material} class="h-4 w-4" />
			{#key dict[material]}
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
								<MaterialCostTooltip {building} costDict={game.costDict} {resourceToSvg}>
									<button
										class="flex flex-col items-center space-x-2 rounded-lg p-1 {selectedBuilding ===
										building
											? amount > 0
												? 'bg-blue-500'
												: 'bg-yellow-500'
											: ''}"
										onclick={handleSelectBuilding(building, game)}
									>
										<img src={`/${building}.svg`} alt={building} class="h-4 w-4" />
										<span class="text-sm font-bold">
											{key}
											{game.players.find((p) => p.name === uniqueName)?.buildingLimits[key] ?? 0}
										</span>
									</button>
								</MaterialCostTooltip>
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
				<div class="user-bar bg-slate-200">
					{#if trading || game.currentGameState == 'discardResouces'}
						<div class="row-start-1 flex flex-row items-center justify-center gap-5">
							{#each allowedMaterials as material}
								{@render materialCard(
									material as Material,
									deselectedMaterials[material as Material],
									false,
									deselectedMaterials
								)}
							{/each}
						</div>
					{/if}

					{#if trading}
						<div class="col-start-2 row-start-1 flex flex-row items-center justify-center gap-5">
							{#each allowedMaterials as material}
								{@render materialCard(
									material as Material,
									selectedMaterials[material as Material],
									false,
									selectedMaterials
								)}
							{/each}
						</div>

						<div class="col-start-2 row-start-2 flex flex-row items-center justify-center gap-5">
							{#each allowedMaterials as material}
								{@render materialCard(
									material as Material,
									selectedMaterials[material as Material],
									false,
									selectedMaterials
								)}
							{/each}
						</div>
					{/if}

					<div class="row-start-2 flex w-full flex-row items-center justify-center gap-5">
						{#each allowedMaterials as material}
							{@const player = game.players.find((p) => p.name === uniqueName)}
							{@render materialCard(
								material as Material,
								player?.resources[material],
								true,
								deselectedMaterials
							)}
						{/each}
					</div>

					{#if !trading || game.currentGameState == 'discardResouces'}
						<button
							class="col-start-3 row-span-2 row-start-1 rounded bg-green-500 px-4 py-2 font-bold text-white hover:bg-green-700 {totalDeselected !==
								(game.waitingForDiscard?.[uniqueName] ?? 0) &&
							game.currentGameState == 'discardResouces'
								? 'bg-gray-500'
								: ''}"
							onclick={() => {
								if (game.currentGameState != 'discardResouces') {
									trading = !trading;
									return;
								}
								let expected = game.waitingForDiscard?.[uniqueName] ?? 0;

								if (totalDeselected !== expected) {
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
							{game.currentGameState == 'discardResouces' && shouldDiscard
								? `Discard ${totalDeselected} / ${game.waitingForDiscard?.[uniqueName]} `
								: 'Trade'}
						</button>
					{:else if trading}
						<button
							class="col-start-3 row-span-1 row-start-1 rounded bg-green-500 px-4 py-2 font-bold text-white hover:bg-green-700"
							onclick={() => {
								// socket!.emit(
								// 	'game command',
								// 	JSON.stringify({
								// 		type: 'trade',
								// 		sender: uniqueName,
								// 		resources: deselectedMaterials
								// 	})
								// );
								// // clear deselected materials
								deselectedMaterials = {
									Wood: 0,
									Brick: 0,
									Wheat: 0,
									Sheep: 0,
									Stone: 0
								};
							}}
						>
							Trade
						</button>

						<button
							class="col-start-3 row-span-1 row-start-2 rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-700"
							onclick={() => {
								trading = false;
								deselectedMaterials = {
									Wood: 0,
									Brick: 0,
									Wheat: 0,
									Sheep: 0,
									Stone: 0
								};
							}}
						>
							Cancel
						</button>
					{/if}
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
							trading = false;
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

<style>
	.user-bar {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		grid-template-rows: repeat(2, 1fr);
		gap: 1rem;
		padding: 1rem;
	}
</style>
