<script lang="ts">
	import axios from 'axios';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// const base_url = 'http://localhost:3001';
	const base_url = 'https://catanaki-production.up.railway.app';

	const createGame = async () => {
		const response = await axios.post(`${base_url}/game`);
		return response.data;
	};

	onMount(() => {
		if (!localStorage.getItem('unique_name')) {
			localStorage.setItem('unique_name', Math.random().toString(36).substring(7));
		}
	});
</script>

<h1 class="text-3xl text-slate-400">Catanaki</h1>

<button
	class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
	on:click={async () => {
		let data = await createGame();
		goto(`/game/${data.id}`);
	}}>Create game</button
>
