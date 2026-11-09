<script setup lang="ts">
import type { SportEnvelope } from "~/utils/openapi";

const route = useRoute();

const { data: sport } = await useAPI<SportEnvelope>(
    () => `/sports/${route.params.sport}`,
);

function isActive(path: string) {
    return route.path.replace(/\/$/, "") === path;
}
</script>

<template>
    <Header :title="sport?.sport.name"></Header>
    <div class="container p-4">
        <NuxtPage />
    </div>
</template>
