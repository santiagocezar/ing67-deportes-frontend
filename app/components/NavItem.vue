<script lang="ts" setup>
const route = useRoute();
const props = defineProps<{
    href: string;
}>();
const active = computed(() => route.path === props.href);
</script>

<template>
    <li class="nav-item">
        <a
            class="nav-link"
            :class="{ active }"
            :aria-current="active ? 'page' : undefined"
            :href
        >
            <slot></slot>
        </a>
    </li>
</template>
