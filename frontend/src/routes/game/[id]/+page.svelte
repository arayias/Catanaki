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
			});
		}
	});
</script>

<div class="entry">
	{#await game}
		<p>Loading...</p>
	{:then game}
		<div class="ml-auto flex justify-center text-3xl font-bold text-white">
			{#if connected}
				<div class="h-4 w-4 animate-pulse rounded-full bg-green-400"></div>
			{:else}
				<div class="h-4 w-4 animate-pulse rounded-full bg-red-400"></div>
			{/if}
		</div>
		<Board {game} {socket} {uniqueName} />
		<button
			class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
			onclick={() => {
				socket!.emit('start game');
			}}
		>
			Start game
		</button>
	{:catch error}
		<p>{error.message}</p>
	{/await}
</div>
