<template>
	<MainLayout active-menu="threeHitSet">
		<ThreeHitSetContent
			ref="contentRef"
			period="previous-month"
			boss-period="previous"
			show-month-notice
			@data-availability="hasData = $event"
			@operation-open="operationOpen = true"
			@operation-close="operationOpen = false"
		/>

		<template #overlay>
			<HitSetPackageGuide
				location="team"
				package-kind="three"
				:active="hasData"
				:operation-open="operationOpen"
				@close-operation="closeGuideOperation"
			/>
		</template>
	</MainLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import HitSetPackageGuide from '../../components/HitSetPackageGuide.vue';
import ThreeHitSetContent from '../../components/ThreeHitSetContent.vue';
import MainLayout from '../../layouts/MainLayout.vue';

const hasData = ref(false);
const operationOpen = ref(false);
const contentRef = ref<OperationContentHandle | null>(null);

interface OperationContentHandle {
	closeOperation: () => void;
}

function closeGuideOperation(): void {
	contentRef.value?.closeOperation();
}
</script>
