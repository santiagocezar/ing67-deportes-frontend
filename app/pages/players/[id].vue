<script setup lang="ts">
import {
    type TeamsListResponse,
    type PlayerResponse as Player,
    type PlayerPhotoListResponse,
} from "~/utils/openapi";

import Subtract from "~icons/fluent/subtract-circle-48-filled";
import Checkmark from "~icons/fluent/checkmark-circle-48-filled";
import Gallery from "~/components/Gallery.vue";

const route = useRoute();

const {
    public: { apiBase },
} = useRuntimeConfig();

const { data: editing, refresh } = await useAPI<Player>(
    () => `/players/${route.params.id}`,
);

const { data: photos, refresh: refreshPhotos } =
    await useAPI<PlayerPhotoListResponse>(
        () => `/players/${route.params.id}/photos`,
    );

const currentPhotos = computed(() =>
    (photos.value?.photos ?? []).map(
        (p) => `${apiBase}/players/${route.params.id}/photos/${p.id}`,
    ),
);
let pendingPhotos: string[] = reactive([]);

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

const team_ids = computed(() => editing.value!.teams.map((team) => team.id));

async function savePlayer(ev: SubmitEvent) {
    ev.preventDefault();
    if (!editing.value) return;
    message.value = "";

    try {
        await $api(`/players/${editing.value.id}`, {
            method: "PUT",
            body: {
                name: editing.value.name,
                team_ids: [...team_ids.value],
            },
        });
    } catch (error) {
        reportError(error);
        return;
    }

    refresh();
}

async function setPlayerEnabled(enabled: boolean) {
    message.value = "";

    try {
        await $api(
            `/players/${route.params.id}/${enabled ? "enable" : "disable"}`,
            {
                method: "PATCH",
            },
        );
    } catch (error) {
        reportError(error);
        return;
    }

    refresh();
}

function toggleTeam(id: number) {
    const index = team_ids.value.indexOf(id);

    if (index === -1) {
        if (team_ids.value.length >= MAX_PLAYER_TEAMS) return;
        team_ids.value.push(id);
    } else {
        team_ids.value.splice(index, 1);
    }
}

async function addPhoto(file: File) {
    const data = new FormData();

    data.set("photo", file);

    pendingPhotos.push(URL.createObjectURL(file));

    await $api(`/players/${route.params.id}/photos`, {
        method: "POST",
        body: data,
    });

    await refreshPhotos();

    pendingPhotos.length = 0;
}
</script>
<template>
    <p class="notification is-danger" v-if="message">{{ message }}</p>
    <form v-if="editing" class="box" action="#" @submit="savePlayer">
        <p class="title is-5">Editar jugador #{{ editing.id }}</p>
        <p>
            {{ editing.sport.name }} ·
            {{ genderLabel(editing.gender!) }}
        </p>
        <br />
        <label class="field">
            <span class="label">Nombre</span>
            <input class="input" v-model="editing.name" type="text" required />
        </label>
        <br />
        <div class="field">
            <span class="label"> Equipos (hasta {{ MAX_PLAYER_TEAMS }}) </span>
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
                    :checked="team_ids.includes(team.id)"
                    :disabled="
                        !team_ids.includes(team.id) &&
                        team_ids.length >= MAX_PLAYER_TEAMS
                    "
                    @change="toggleTeam(team.id)"
                />
                {{ team.name }}
            </label>
        </div>
        <br />

        <div class="is-flex">
            <button
                class="button"
                aria-label="Deshabilitar"
                v-if="editing.is_enabled"
                @click="setPlayerEnabled(false)"
            >
                <span class="icon is-small has-text-danger">
                    <Subtract />
                </span>
                <span> Deshabilitar </span>
            </button>

            <button
                class="button"
                aria-label="Habilitar"
                v-else
                @click="setPlayerEnabled(true)"
            >
                <span class="icon is-small has-text-success">
                    <Checkmark />
                </span>
                Habilitar
            </button>
            <div class="is-flex-grow-1"></div>
            <button class="button is-primary">Guardar cambios</button>
        </div>
    </form>
    <Gallery :currentPhotos :pendingPhotos editing @add="addPhoto" />
</template>
