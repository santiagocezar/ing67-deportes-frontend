<script setup lang="ts">
interface APISports {
    sports: Sport[];
}

interface Sport {
    id?: number;
    max_players: number;
    max_players_in_game: number;
    name: string;
}

const { $api } = useNuxtApp();
const { data, refresh } = await useAPI<APISports>("/sports");

const value = reactive<Sport>({
    max_players: 0,
    max_players_in_game: 0,
    name: "",
});

async function addSport(ev: SubmitEvent) {
    ev.preventDefault();

    await $api("/sports", {
        method: "POST",
        body: { ...value },
    });
    refresh();
}
</script>

<template>
    <form action="#" @submit="addSport">
        <label class="field">
            <span class="label">Nombre</span>
            <input class="input" v-model="value.name" type="text" />
        </label>
        <br />
        <label class="field">
            <span class="label">Máx. de jugadores</span>
            <input
                class="input"
                v-model="value.max_players"
                type="number"
                min="1"
            />
        </label>
        <br />
        <label class="field">
            <span class="label">Jugadores en cancha</span>
            <input
                class="input"
                v-model="value.max_players_in_game"
                type="number"
                min="1"
            />
        </label>
        <br />
        <button class="button is-primary">Agregar deporte</button>
    </form>
    <table class="table" v-if="data">
        <thead>
            <tr>
                <th>ID</th>
                <th>Máx. de jugadores</th>
                <th>Jugadores en cancha</th>
                <th>Nombre</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="sport in data.sports">
                <td>
                    {{ sport.id }}
                </td>
                <td>
                    {{ sport.max_players }}
                </td>
                <td>
                    {{ sport.max_players_in_game }}
                </td>
                <td>
                    {{ sport.name }}
                </td>
            </tr>
        </tbody>
    </table>
    <p v-else>Hubo un problema para cargar los datos</p>
</template>
