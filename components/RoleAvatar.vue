<template>
	<view
		class="role-avatar-wrap guide-target-role"
		:class="{ 'role-disabled': disabled, 'role-interactive': interactive }"
		:aria-disabled="!interactive"
		@click="handleToggle"
	>
		<image class="role-avatar" :src="role.image_url || ''" mode="aspectFill" />
	</view>
</template>

<script setup lang="ts">
import type { TeamRole } from '../api/types';

const props = withDefaults(defineProps<{
	role: TeamRole;
	disabled: boolean;
	interactive?: boolean;
}>(), {
	interactive: true,
});

const emit = defineEmits<{ (event: 'toggle'): void }>();

function handleToggle(): void {
	if (props.interactive) {
		emit('toggle');
	}
}
</script>

<style>
.role-avatar-wrap {
	width: 60px;
	height: 60px;
	flex-shrink: 0;
	overflow: hidden;
	border: 2px solid #2376b9;
	border-radius: 8px;
	background: var(--bg-subtle);
	cursor: default;
	transition: transform 0.22s ease;
}
.role-avatar-wrap.role-interactive {
	cursor: pointer;
}
.role-avatar-wrap.role-interactive:hover {
	transform: translateY(-2px);
}
.role-avatar {
	width: 100%;
	height: 100%;
	display: block;
	transition: filter 0.18s ease;
}
.role-disabled .role-avatar {
	filter: grayscale(1) brightness(0.58);
}
@media screen and (max-width: 1360px) {
	.role-avatar-wrap {
		width: 43px;
		height: 43px;
	}
}
@media screen and (max-width: 1200px) {
	.role-avatar-wrap {
		width: 43px;
		height: 43px;
	}
}
@media screen and (max-width: 700px) {
	.role-avatar-wrap {
		width: 52px;
		height: 52px;
	}
}
</style>
