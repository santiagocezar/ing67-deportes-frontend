<script setup lang="ts">
import type { SportListResponse } from "~/utils/openapi";
import { IconArrowExit, IconChevronUpDown, IconSettings } from "~/assets/icons";

interface Props {
    title?: string;
}

const { title } = defineProps<Props>();

const route = useRoute();

const auth = useAuth();
const { data: sports } = await useAPI<SportListResponse>("/sports");
const { me, isAdministrator } = useCurrentUser();

watch(
    () => auth.token,
    () => refreshCurrentUser(),
);
</script>

<template>
    <header class="navbar border-bottom flex-shrink-0">
        <div class="container px-4">
            <button
                class="btn-solid fg-body"
                type="button"
                data-bs-toggle="menu"
                aria-expanded="false"
            >
                <span class="fw-bold">
                    {{
                        sports?.sports.find((s) => s.id == route.params.sport)
                            ?.name ?? "Deportes"
                    }}
                </span>
                <IconChevronUpDown />
            </button>
            <div class="menu">
                <NuxtLink
                    v-for="sport in sports?.sports"
                    :key="sport.id"
                    class="menu-item"
                    :class="{ active: sport.id == route.params.sport }"
                    :to="{ name: 'home-sport', params: { sport: sport.id } }"
                >
                    {{ sport.name }}
                </NuxtLink>
                <template v-if="isAdministrator">
                    <hr class="menu-divider" />
                    <NuxtLink class="menu-item" to="/sports">
                        <IconSettings /> Gestionar deportes
                    </NuxtLink>
                </template>
            </div>
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
                    <!--
                    <NuxtLink to="#" class="menu-item">
                        <IconSettings />
                        Gestión
                    </NuxtLink>
                    <hr class="menu-divider" />
					-->
                    <div class="menu-text">{{ me?.user.name }}</div>
                    <button class="menu-item fg-danger" @click="auth.logout()">
                        <IconArrowExit />
                        Cerrar sesión
                    </button>
                </div>

                <NuxtLink
                    v-else
                    class="btn-solid btn-styled theme-primary"
                    to="/login"
                >
                    Iniciar sesión
                </NuxtLink>
            </div>
        </div>
    </header>
</template>

<style scoped>
header {
    --bs-navbar-padding-y: 0.75rem;
}
</style>
