<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import axios from 'axios';
	import Board from '../../../components/Board.svelte';

	const id = $page.params.id;
	const getBoard = async () => {
		const response = await axios.get(`http://localhost:3001/board/${id}`);
		return response.data;
	};

	let board: any = $state(new Promise(() => {}));
	$effect(() => {
		board = getBoard();
	});
</script>

<div class="entry">
	{#await board}
		<p>Loading...</p>
	{:then board}
		<Board {board} {id} />
	{:catch error}
		<p>{error.message}</p>
	{/await}
</div>
