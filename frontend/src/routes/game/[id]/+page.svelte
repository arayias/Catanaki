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

	const getGame = async () => {
		const response = await axios.get(`http://localhost:3001/game/${id}`);
		return response.data;
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
		<div class="flex flex-col items-center justify-center bg-slate-200 p-3">
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
				{#each game.players as player}
					<div>
						{player.name}
						{#if player.name === game.currentPlayer}
							<span>🎲</span>
						{/if}
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
			{/if}
		</div>
	{:catch error}
		<p>{error.message}</p>
	{/await}
</div>
