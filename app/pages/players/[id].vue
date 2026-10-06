
<script setup lang="ts">

import { type TeamsListResponse, type PlayerResponse as Player } from "~/utils/openapi";
const route = useRoute()
const {data: editing, refresh} = await useAPI<Player>(() => `/players/${route.params.id}`)


const message = ref("");

const { $api } = useNuxtApp();


const MAX_PLAYER_TEAMS = 3;


const { data: editTeamsData } = await useAPI<TeamsListResponse>("/teams", {
    query: computed(() => ({
        status: "enabled",
        sort: "name_asc",
        sport_id: editing.value?.sport.id,
        gender_category: editing.value?.gender,
    })),
    enabled: computed(() => editing.value !== null),
});


function genderLabel(gender: Player["gender"]) {
    return gender === "male" ? "Masculino" : "Femenino";
}

const edited = reactive<{ name: string; team_ids: number[] }>({
    name: "",
    team_ids: [],
});
        edited.name = editing.value!.name;
        edited.team_ids = editing.value!.teams.map((team) => team.id);


async function startEdit(player: Player) {
    message.value = "";

    try {
        // Se relee el jugador para editar sobre el estado actual.
        const current = await $api<Player>(`/players/${player.id}`);

        editing.value = current;
    } catch (error) {
        reportError(error);
    }
}

function cancelEdit() {
    editing.value = undefined;
    edited.name = "";
    edited.team_ids = [];
}

async function savePlayer(ev: SubmitEvent) {
    ev.preventDefault();
    if (!editing.value) return;
    message.value = "";

    try {
        await $api(`/players/${editing.value.id}`, {
            method: "PUT",
            body: {
                name: edited.name,
                team_ids: [...edited.team_ids],
            },
        });
    } catch (error) {
        reportError(error);
        return;
    }

    cancelEdit();
    refresh();
}

async function setPlayerEnabled(player: Player, enabled: boolean) {
    message.value = "";

    try {
        await $api(`/players/${player.id}/${enabled ? "enable" : "disable"}`, {
            method: "PATCH",
        });
    } catch (error) {
        reportError(error);
        return;
    }

    refresh();
}

function toggleTeam(team_ids: number[], id: number) {
    const index = team_ids.indexOf(id);

    if (index === -1) {
        if (team_ids.length >= MAX_PLAYER_TEAMS) return;
        team_ids.push(id);
    } else {
        team_ids.splice(index, 1);
    }
}



</script>
<template>

    <p class="notification is-danger" v-if="message">{{ message }}</p>
            <form class="box" action="#" @submit="savePlayer">
                <p class="title is-5">Editar jugador #{{ editing?.id }}</p>
                <p>
                    {{ editing?.sport.name }} ·
                    {{ genderLabel(editing?.gender!) }}
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
                <div class="field">
                    <span class="label">
                        Equipos (hasta {{ MAX_PLAYER_TEAMS }})
                    </span>
                    <p v-if="!editTeamsData?.teams.length">
                        No hay equipos habilitados para esa combinación.
                    </p>
                    <label
                        class="checkbox"
                        v-for="team in editTeamsData?.teams"
                        :key="team.id"
                    >
                        <input
                            type="checkbox"
                            :checked="edited.team_ids.includes(team.id)"
                            :disabled="
                                !edited.team_ids.includes(team.id) &&
                                edited.team_ids.length >= MAX_PLAYER_TEAMS
                            "
                            @change="toggleTeam(edited.team_ids, team.id)"
                        />
                        {{ team.name }}
                    </label>
                </div>
                <br />
                <button class="button is-primary">Guardar cambios</button>
                <button class="button" type="button" @click="cancelEdit">
                    Cancelar
                </button>
            </form>

</template>
