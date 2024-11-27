<script>
	let { children, building, costDict, resourceToSvg } = $props();
	let requiredResources = costDict[building.charAt(0).toUpperCase() + building.slice(1)];
</script>

<div>
	{#if children}
		<div class="tooltip">
			{@render children()}
			<span class="tooltiptext">
				{#each Object.keys(requiredResources) as resource}
					<div class="flex items-center">
						<img src={resourceToSvg[resource]} alt={resource} class="h-6 w-6" />
						<span class="ml-2">{requiredResources[resource]}</span>
					</div>
				{/each}
			</span>
		</div>
	{/if}
</div>

<style>
	.tooltip {
		position: relative;
		display: inline-block;
		border-bottom: 0.5px dotted black; /* If you want dots under the hoverable text */
	}

	.tooltip .tooltiptext {
		visibility: hidden;
		width: 120px;
		background-color: black;
		color: #fff;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 5px 0;
		border-radius: 6px;

		position: absolute;
		z-index: 1;
	}

	/* Show the tooltip text when you mouse over the tooltip container */
	.tooltip:hover .tooltiptext {
		visibility: visible;
	}
</style>
