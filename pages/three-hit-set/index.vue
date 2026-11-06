<template>
	<MainLayout active-menu="threeHitSet">
		<ThreeHitSetContent
			period="previous-month"
			boss-period="previous"
			show-month-notice
		/>
	</MainLayout>
</template>

<script setup lang="ts">
import ThreeHitSetContent from '../../components/ThreeHitSetContent.vue';
import MainLayout from '../../layouts/MainLayout.vue';
</script>
