<script lang="ts">
	import { resolve } from '$app/paths';
	import { languages } from '$lib/languages';
</script>

<!--
  The language picker. The original was one app per language, so there is no
  screen of its own to copy: each language is shown the way its own app
  presents itself, with its icon, its name and its palette, and leads to that
  language's global overview.
-->
<svelte:head>
	<title>{languages.map((language) => language.appName).join(' / ')}</title>
	<link rel="icon" href={languages[0].icon} />
	<link rel="apple-touch-icon" href={languages[0].icon} />
</svelte:head>

<main id="inhoud" class="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
	<ul class="flex flex-col gap-4">
		{#each languages as language (language.id)}
			{@const [nameStart, nameEnd] = language.appName.split(': ')}
			<li data-palette={language.id}>
				<a
					href={resolve('/[language=language]', { language: language.id })}
					class="bg-primary flex items-center gap-5 rounded-lg px-5 py-6 text-white shadow-lg transition hover:shadow-xl hover:brightness-110 focus:shadow-xl focus:brightness-110"
				>
					<img src={language.icon} alt="" class="size-16 shrink-0 rounded-xl ring-2 ring-white" />
					<span class="text-2xl font-medium">{nameStart}:<br />{nameEnd}</span>
				</a>
			</li>
		{/each}
	</ul>
</main>
