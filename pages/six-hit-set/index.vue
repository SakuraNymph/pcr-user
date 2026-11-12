<template>
	<MainLayout active-menu="sixHitSet">
		<SixHitSetContent
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
				location="group"
				package-kind="six"
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
import SixHitSetContent from '../../components/SixHitSetContent.vue';
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
