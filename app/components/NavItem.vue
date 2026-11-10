<script lang="ts" setup>
const { icon, to, active } = defineProps<{
    icon: any;
    iconActive: any;
    to: string;
    active: boolean;
}>();
</script>

<template>
    <li class="position-relative nav-item text-xl" :class="{ active }">
        <component class="icon" :is="active ? iconActive : icon" />
        <NuxtLink
            class="nav-link stretched-link"
            :aria-current="active ? 'page' : undefined"
            :to
        >
            <slot></slot>
        </NuxtLink>
    </li>
</template>

<style scoped>
.nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    height: 100%;

    & a {
        font-size: 0.5em;
    }

    &.active .icon {
        color: var(--bs-primary-base);
    }
}
</style>
