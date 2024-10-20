<script lang="ts">
	import { page } from '$app/stores';
	import axios from 'axios';
	import Board from '../../../components/Board.svelte';
	import { io } from 'socket.io-client';

	const id = $page.params.id;
	let connectedPlayers = $state(0);
	let connected = $state(false);

	const getGame = async () => {
		const response = await axios.get(`http://localhost:3001/game/${id}`);
		return response.data;
	};

	const socket = $state(io('ws://localhost:3001/'));
	socket.on('connect', () => {
		connected = true;
		socket.on('disconnect', () => {
			connected = false;
		});
	});

	socket.emit('join game', id);

	let game: any = $state(new Promise(() => {}));
	$effect(() => {
		game = getGame();
	});
</script>

<div class="entry">
	{#await game}
		<p>Loading...</p>
	{:then game}
		<div class="flex justify-center text-3xl font-bold text-white">
			{#if connected}
				<div class="h-4 w-4 animate-pulse rounded-full bg-green-400"></div>
			{:else}
				<div class="h-4 w-4 animate-pulse rounded-full bg-red-400"></div>
			{/if}
		</div>
		<Board {game} {socket} />
	{:catch error}
		<p>{error.message}</p>
	{/await}
</div>
