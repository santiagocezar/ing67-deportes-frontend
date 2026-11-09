<script setup lang="ts">
import type { AuthMeResponse } from "~/utils/openapi";
import ArrowExit from "~icons/fluent/arrow-exit-48-filled";

import Settings from "~icons/fluent/settings-48-regular";

interface Props {
    title?: string;
}

const { title } = defineProps<Props>();

const auth = useAuth();
const { data: me, refresh: refreshMe } = await useAPI<AuthMeResponse>(
    "/auth/me",
    {
        onResponseError: () => {}, // evitar redirigir
    },
);

watch(
    () => auth.token,
    () => refreshMe(),
);
</script>

<template>
    <header class="navbar border-bottom flex-shrink-0">
        <div class="container px-4">
            <h1 class="h4 m-0 fg-body fw-bold">{{ title }}</h1>
            <div class="d-flex gap-4">
                <slot></slot>
                <button
                    v-if="me"
                    class="nav-link"
                    type="button"
                    data-bs-toggle="menu"
                    aria-expanded="false"
                >
                    <span class="avatar theme-accent">{{
                        me?.user.name[0]
                    }}</span>
                </button>
                <div v-if="me" class="menu">
                    <a href="/settings" class="menu-item">
                        <Settings />
                        Gestión
                    </a>
                    <hr class="menu-divider" />
                    <div class="menu-text">{{ me?.user.name }}</div>
                    <button class="menu-item fg-danger" @click="auth.logout()">
                        <ArrowExit />
                        Cerrar sesión
                    </button>
                </div>

                <a
                    v-else
                    class="btn-solid btn-styled theme-primary"
                    href="/login"
                >
                    Iniciar sesión
                </a>
            </div>
        </div>
    </header>
</template>

<style scoped>
header {
    --bs-navbar-padding-y: 0.75rem;
}
</style>
