<script setup lang="ts">
import PersonIcon from "~icons/fluent/person-48-filled";
import ArrowExit from "~icons/fluent/arrow-exit-48-filled";

const auth = useAuth();
const { data: me, refresh: refreshMe } = await useAPI<api.GetMe>("/auth/me", {
    onResponseError: () => {}, // evitar redirigir
});

watch(
    () => auth.token,
    () => refreshMe(),
);
</script>

<template>
    <nav class="navbar" role="navigation" aria-label="main navigation">
        <div class="navbar-brand">
            <a class="navbar-item" href="/">
                <img src="~/assets/img/67.png" alt="" />
            </a>
            <!--
            <a
                role="button"
                class="navbar-burger"
                aria-label="menu"
                aria-expanded="false"
                data-target="navbarBasicExample"
            >
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
            </a> -->
        </div>

        <div id="navbarBasicExample" class="navbar-menu">
            <div class="navbar-start">
                <a class="navbar-item" href="/sports"> Deportes </a>
                <a class="navbar-item" href="/teams"> Equipos </a>
                <a class="navbar-item" href="/players"> Jugadores </a>
            </div>

            <div class="navbar-end">
                <div v-if="me" class="navbar-item">
                    <PersonIcon />
                    <span>
                        {{ me.user.name }}
                    </span>
                    <button
                        class="button is-rounded is-inverted is-danger"
                        @click="auth.logout()"
                    >
                        <ArrowExit />
                    </button>
                </div>
                <div v-else class="navbar-item">
                    <a class="button is-light" href="/login">Iniciar sesión</a>
                </div>
            </div>
        </div>
    </nav>
    <NuxtPage />
</template>
