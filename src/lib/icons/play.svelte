<script lang="ts">
	// The clip has to be addressable, and a page can hold dozens of play icons.
	const clip = $props.id();
</script>

<svg width="26" height="29" viewBox="0 0 26 29" fill="none" xmlns="http://www.w3.org/2000/svg">
	<g clip-path="url(#{clip})">
		<path
			d="M24.6304 12.1609L4.20179 0.37395C2.54196 -0.583276 0 0.34563 0 2.71321V26.2814C0 28.4054 2.36205 29.6855 4.20179 28.6206L24.6304 16.8394C26.4527 15.7915 26.4585 13.2087 24.6304 12.1609Z"
		/>
	</g>
	<defs>
		<clipPath id={clip}>
			<rect width="26" height="29" fill="white" />
		</clipPath>
	</defs>
</svg>
