<script setup lang="ts">
import People from "~icons/fluent/people-48-regular";
import PeopleActive from "~icons/fluent/people-48-filled";

import Home from "~icons/fluent/home-48-regular";
import HomeActive from "~icons/fluent/home-48-filled";

import Shield from "~icons/fluent/shield-48-regular";
import ShieldActive from "~icons/fluent/shield-48-filled";

import type { AuthMeResponse } from "~/utils/openapi";

const auth = useAuth();
const { data: me, refresh: refreshMe } = await useAPI<AuthMeResponse>(
    "/auth/me",
    {
        onResponseError: () => {}, // evitar redirigir
    },
);

const route = useRoute();

const sportId = computed(() => route.params.sport);

const routes = computed(() => [{ icon: Home }]);

watch(
    () => auth.token,
    () => refreshMe(),
);
</script>

<template>
    <slot></slot>
    <div class="sticky-bottom p-4 md:p-6 mt-auto mx-auto">
        <nav class="shadow-xl card card-translucent">
            <ul class="m-0 card-body nav-buttons">
                <NavItem
                    :icon="Home"
                    :iconActive="HomeActive"
                    :to="`/home/${sportId}/`"
                >
                    Inicio
                </NavItem>
                <NavItem
                    :icon="People"
                    :iconActive="PeopleActive"
                    :to="`/home/${sportId}/players`"
                >
                    Jugadores
                </NavItem>
                <NavItem
                    :icon="Shield"
                    :iconActive="ShieldActive"
                    :to="`/home/${sportId}/teams`"
                >
                    Equipos
                </NavItem>
            </ul>
        </nav>
    </div>
</template>

<style lang="css" scoped>
.nav-buttons {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
}
</style>
