<template>
	<svg
		class="star-icon"
		:width="size"
		:height="size"
		viewBox="0 0 24 24"
		aria-hidden="true"
	>
		<path
			d="M11.11 4.48 Q12 2.8 12.89 4.48 L14.38 7.28 Q14.82 8.12 15.76 8.28 L18.88 8.83 Q20.75 9.16 19.43 10.52 L17.23 12.8 Q16.57 13.48 16.7 14.42 L17.14 17.56 Q17.41 19.44 15.7 18.61 L12.85 17.22 Q12 16.8 11.15 17.22 L8.3 18.61 Q6.59 19.44 6.86 17.56 L7.3 14.42 Q7.43 13.48 6.77 12.8 L4.57 10.52 Q3.25 9.16 5.12 8.83 L8.24 8.28 Q9.18 8.12 9.62 7.28 L11.11 4.48 Z"
			:fill="filled ? color : 'none'"
			:stroke="color"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
	size?: number;
	color?: string;
	filled?: boolean;
}>(), {
	size: 22,
	color: '#F5CE65',
	filled: false,
});
</script>

<style scoped>
.star-icon {
	display: block;
	flex: 0 0 auto;
	overflow: visible;
}
</style>
