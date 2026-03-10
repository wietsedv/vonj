<script lang="ts">
	let { title, description, Icon } = $props();
</script>

<div class="bg-primary px-4 py-18 shadow-lg">
	<div class="mx-auto max-w-md text-center text-white">
		<div class="flex w-full items-center justify-center gap-2 [&>svg]:fill-white">
			<Icon />
			<h1 class="my-4 text-4xl font-medium">
				{title}
			</h1>
		</div>
		<p>{description}</p>
	</div>
</div>
