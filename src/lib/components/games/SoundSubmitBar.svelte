<script lang="ts">
	/**
	 * The submit control shared by the three sound-column games that own it -
	 * `SprekenWoorden.svelte`, `LuisterenWoorden.svelte` and
	 * `LuisterenWoordenTijdslimiet.svelte` - so the markup for "Versturen" and
	 * its inline alert is not repeated three times.
	 *
	 * `canSubmit` is `SoundAnswer.canSubmit`: the "Versturen" button appears
	 * once every column has a choice and something changed since the last
	 * submit (`docs/original-app/games.md`, "Luisteren > Woorden"). `incomplete`
	 * is `SoundAnswer.incomplete`, the inline "Selecteer eerst alle klanken"
	 * message that replaces the original's blocking `window.alert` (see
	 * `docs/rewrite.md`, "Alerts are inline messages, not dialogs"). In
	 * practice it can only turn true if a caller submits without going through
	 * this button, because the button itself never shows while a column is
	 * still empty - see the doc comment on `SoundAnswer.submit()` - but it is
	 * rendered here regardless, the same way `SentenceBoard.svelte` renders its
	 * own wrong-order message.
	 */
	interface Props {
		canSubmit: boolean;
		incomplete: boolean;
		onsubmit: () => void;
	}

	let { canSubmit, incomplete, onsubmit }: Props = $props();
</script>

{#if incomplete}
	<p class="bg-primary/10 text-primary rounded-xl px-4 py-3 text-sm font-medium" role="alert">
		Selecteer eerst alle klanken
	</p>
{/if}

{#if canSubmit}
	<button
		type="button"
		onclick={onsubmit}
		class="bg-accent rounded-full px-8 py-3 font-medium text-white transition hover:brightness-95 focus:brightness-95"
	>
		Versturen
	</button>
{/if}
