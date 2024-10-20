<script lang="ts">
	import axios from 'axios';
	import { goto } from '$app/navigation';

	const createGame = async () => {
		const response = await axios.post('http://localhost:3001/game');
		return response.data;
	};
</script>

<h1 class="text-3xl text-slate-400">Catanaki</h1>

<button
	class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
	on:click={async () => {
		let data = await createGame();
		goto(`/game/${data.id}`);
	}}>Create game</button
>
