<script setup lang="ts">
import PersonIcon from "~icons/fluent/person-48-filled";
import ArrowExit from "~icons/fluent/arrow-exit-48-filled";
import type { AuthMeResponse } from "~/utils/openapi";

const auth = useAuth();
const { data: me, refresh: refreshMe } = await useAPI<AuthMeResponse>(
    "/auth/me",
    {
        onResponseError: () => {}, // evitar redirigir
    },
);

const menu = ref(false);

watch(
    () => auth.token,
    () => refreshMe(),
);
</script>

<template>
    <nav class="navbar md:navbar-expand bg-1">
        <div class="container-fluid">
            <a class="navbar-brand" href="#">
                <img src="~/assets/img/67.png" alt="" height="32" />
            </a>
            <button
                class="btn-icon navbar-toggler"
                type="button"
                data-bs-toggle="drawer"
                data-bs-target="#navbarDrawer"
                aria-controls="navbarDrawer"
                aria-expanded="false"
                aria-label="Toggle navigation"
            >
                <span class="navbar-toggler-icon" aria-hidden="true"></span>
            </button>
            <dialog
                class="drawer drawer-end"
                tabindex="-1"
                id="navbarDrawer"
                aria-labelledby="navbarDrawerLabel"
            >
                <div class="drawer-header">
                    <h5 class="drawer-title" id="navbarDrawerLabel">Menu</h5>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="drawer"
                        aria-label="Close"
                    ></button>
                </div>
                <div class="drawer-body mb-2 md:mb-0">
                    <ul class="nav navbar-nav me-auto flex-grow-1">
                        <NavItem href="/sports"> Deportes </NavItem>
                        <NavItem href="/teams"> Equipos </NavItem>
                        <NavItem href="/players"> Jugadores </NavItem>
                        <NavItem href="/competitions"> Competencias </NavItem>
                    </ul>
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
                        <div class="menu-text">{{ me?.user.name }}</div>
                        <!-- <hr class="menu-divider" /> -->
                        <button
                            class="menu-item fg-danger"
                            @click="auth.logout()"
                        >
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
            </dialog>
        </div>
    </nav>
    <slot></slot>
</template>
