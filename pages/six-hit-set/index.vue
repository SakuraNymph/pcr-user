<template>
	<MainLayout active-menu="sixHitSet">
		<SixHitSetContent
			period="previous-month"
			boss-period="previous"
			show-month-notice
		/>
	</MainLayout>
</template>

<script setup lang="ts">
import SixHitSetContent from '../../components/SixHitSetContent.vue';
import MainLayout from '../../layouts/MainLayout.vue';
</script>
