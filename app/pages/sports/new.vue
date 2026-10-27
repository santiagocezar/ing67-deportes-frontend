<script setup lang="ts">
import type { SportCreateRequest, SportEnvelope } from "~/utils/openapi";

const { $api } = useNuxtApp();

const value = reactive<{
    name: string;
    max_players: number | "";
    max_players_in_game: number | "";
}>({
    name: "",
    max_players: "",
    max_players_in_game: "",
});

const message = ref("");
const saving = ref(false);

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

async function addSport(ev: SubmitEvent) {
    ev.preventDefault();
    message.value = "";

    saving.value = true;
    let sport: SportEnvelope["sport"];

    try {
        const response = await $api<SportEnvelope>("/sports", {
            method: "POST",
            body: {
                name: value.name,
                max_players: value.max_players,
                max_players_in_game: value.max_players_in_game,
            } satisfies SportCreateRequest,
        });
        sport = response.sport;
    } catch (error) {
        reportError(error);
        saving.value = false;
        return;
    }

    await navigateTo(`/sports/${sport.id}`);
}
</script>

<template>
    <div class="container p-4">
        <div class="alert theme-danger" role="alert" v-if="message">
            {{ message }}
        </div>

        <h1 class="h4 mb-3">Agregar deporte</h1>

        <form class="vstack gap-3" action="#" @submit="addSport">
            <div class="form-field">
                <label for="name" class="form-label">Nombre</label>
                <input
                    class="form-control"
                    id="name"
                    v-model="value.name"
                    type="text"
                    required
                />
            </div>

            <div class="row g-3">
                <div class="md:col-6 form-field">
                    <label for="max_players" class="form-label">
                        Máx. de jugadores
                    </label>
                    <input
                        class="form-control"
                        id="max_players"
                        v-model.number="value.max_players"
                        type="number"
                        min="1"
                        required
                    />
                </div>
                <div class="md:col-6 form-field">
                    <label for="max_players_in_game" class="form-label">
                        Jugadores en cancha
                    </label>
                    <input
                        class="form-control"
                        id="max_players_in_game"
                        v-model.number="value.max_players_in_game"
                        type="number"
                        min="1"
                        required
                    />
                </div>
            </div>

            <div class="d-flex align-items-center gap-2">
                <a class="btn-outline theme-secondary" href="/sports">
                    Cancelar
                </a>
                <button
                    class="btn-solid theme-primary ms-auto"
                    :disabled="saving"
                >
                    Confirmar
                </button>
            </div>
        </form>
    </div>
</template>
