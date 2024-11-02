<script lang="ts">
	import { page } from '$app/stores';
	import axios from 'axios';
	import Board from '../../../components/Board.svelte';
	import { io, Socket } from 'socket.io-client';
	import { onMount } from 'svelte';

	const id = $page.params.id;
	let connectedPlayers = $state(0);
	let connected = $state(false);
	let uniqueName = $state('');
	let selectedBuilding = $state('');

	let allowedBuildings = ['settlement', 'city', 'road'];

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
	{#await game}
		<p>Loading...</p>
	{:then game}
		<Board {game} {socket} {uniqueName} />
		<div class="flex flex-col items-center justify-center bg-slate-200 p-5">
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
					<button
						class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
						onclick={() => {
							socket!.emit(
								'game command',
								JSON.stringify({ type: 'rollDice', sender: uniqueName })
							);
						}}
					>
						End turn
					</button>
				{/if}
				{#if game.currentPlayer === uniqueName}
					<div class="flex flex-col items-center justify-center bg-slate-200 p-5">
						{#each allowedBuildings as building}
							<button
								class="flex flex-col items-center space-x-2 rounded-lg p-1 {selectedBuilding ===
								building
									? 'bg-blue-500'
									: ''}"
								onclick={handleSelectBuilding(building)}
							>
								<img src={`/${building}.svg`} alt={building} class="h-4 w-4" />
								<span>{building.slice(0, 1).toUpperCase() + building.slice(1)}</span>
							</button>
						{/each}
					</div>
				{/if}
			{/if}
			{#each game.players as player}
				<div
					class="mt-1 w-full rounded-lg p-2 {player.name === game.currentPlayer
						? 'bg-blue-500'
						: 'bg-slate-300'}"
				>
					{player.name}

					<div class="text-sm font-bold text-black">
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
					</div>
				</div>
			{/each}
		</div>
	{:catch error}
		<p>{error.message}</p>
	{/await}
</div>
