<script>
	import '../app.css';
	import { SvelteToast } from '@zerodevx/svelte-toast';
</script>

<div class="mx-auto my-auto flex h-[90vh] w-[90%] flex-col items-center justify-center">
	<slot></slot>
	<SvelteToast></SvelteToast>
</div>
