<script setup lang="ts">
import type { SportListResponse, SportResponse } from "~/utils/openapi";

const { $api } = useNuxtApp();
const { data, refresh } = await useAPI<SportListResponse>("/sports");

const value = reactive<SportResponse>({
    id: 0,
    max_players: 0,
    max_players_in_game: 0,
    name: "",
});

const editing = ref<SportResponse | null>(null);
const edited = reactive<{ name: string }>({
    name: "",
});

const message = ref("");

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

async function addSport(ev: SubmitEvent) {
    ev.preventDefault();
    message.value = "";

    try {
        await $api("/sports", {
            method: "POST",
            body: {
                name: value.name,
                max_players: value.max_players,
                max_players_in_game: value.max_players_in_game,
            },
        });
    } catch (error) {
        reportError(error);
        return;
    }

    value.name = "";
    value.max_players = 0;
    value.max_players_in_game = 0;
    refresh();
}

function startEdit(sport: SportResponse) {
    message.value = "";
    editing.value = sport;
    edited.name = sport.name;
}

function cancelEdit() {
    editing.value = null;
    edited.name = "";
}

async function saveSport(ev: SubmitEvent) {
    ev.preventDefault();
    if (!editing.value) return;
    message.value = "";

    try {
        await $api(`/sports/${editing.value.id}`, {
            method: "PUT",
            body: {
                name: edited.name,
            },
        });
    } catch (error) {
        reportError(error);
        return;
    }

    cancelEdit();
    refresh();
}
</script>

<template>
    <p class="notification is-danger" v-if="message">{{ message }}</p>

    <form action="#" @submit="addSport">
        <label class="field">
            <span class="label">Nombre</span>
            <input class="input" v-model="value.name" type="text" required />
        </label>

        <label class="field">
            <span class="label">Máx. de jugadores</span>
            <input
                class="input"
                v-model="value.max_players"
                type="number"
                min="1"
            />
        </label>

        <label class="field">
            <span class="label">Jugadores en cancha</span>
            <input
                class="input"
                v-model="value.max_players_in_game"
                type="number"
                min="1"
            />
        </label>

        <button class="button is-primary">Agregar deporte</button>
    </form>

    <table class="table" v-if="data">
        <thead>
            <tr>
                <th>ID</th>
                <th>Máx. de jugadores</th>
                <th>Jugadores en cancha</th>
                <th>Nombre</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="sport in data.sports" :key="sport.id">
                <td>{{ sport.id }}</td>
                <td>{{ sport.max_players }}</td>
                <td>{{ sport.max_players_in_game }}</td>
                <td>{{ sport.name }}</td>
                <td>
                    <button
                        class="button is-small"
                        @click="startEdit(sport)"
                    >
                        Editar
                    </button>
                </td>
            </tr>
        </tbody>
    </table>
    <p v-else>Hubo un problema para cargar los datos</p>

    <div class="modal is-active" v-if="editing">
        <div class="modal-background" @click="cancelEdit"></div>
        <div class="modal-content">
            <form class="box" action="#" @submit="saveSport">
                <p class="title is-5">Editar deporte #{{ editing.id }}</p>
                <p>
                    Máx. {{ editing.max_players }} jugadores ·
                    {{ editing.max_players_in_game }} en cancha
                </p>
                <br />
                <label class="field">
                    <span class="label">Nombre</span>
                    <input
                        class="input"
                        v-model="edited.name"
                        type="text"
                        required
                    />
                </label>
                <br />
                <button class="button is-primary">Guardar cambios</button>
                <button class="button" type="button" @click="cancelEdit">
                    Cancelar
                </button>
            </form>
        </div>
        <button class="modal-close is-large" @click="cancelEdit"></button>
    </div>
</template>
