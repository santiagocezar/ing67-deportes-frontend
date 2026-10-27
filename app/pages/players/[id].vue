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
const photoError = ref("");

const { $api } = useNuxtApp();

const MAX_PLAYER_TEAMS = 3;
const MAX_PHOTOS = 3;

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

async function deletePhoto(url: string) {
    await $api(url, {
        method: "DELETE",
    });

    await refreshPhotos();
}
async function addPhoto(file: File) {
    const data = new FormData();
    data.set("photo", file);

    pendingPhotos.push(URL.createObjectURL(file));

    try {
        photoError.value = "";
        await $api(`/players/${route.params.id}/photos`, {
            method: "POST",
            body: data,
        });
    } catch (err) {
        photoError.value = getError(err);
    } finally {
        await refreshPhotos();
        pendingPhotos.length = 0;
    }
}
</script>
<template>
    <div class="container p-4">
        <div class="alert theme-danger" role="alert" v-if="message">
            {{ message }}
        </div>

        <template v-if="editing">
            <h1 class="h4 mb-1">Detalles del jugador #{{ editing.id }}</h1>

            <div class="form-text">
                Juega:
                <a :href="`/sports/${editing.sport.id}`">
                    {{ editing.sport.name }}
                    {{ genderLabel(editing.gender!) }}
                </a>
            </div>

            <form class="vstack gap-3" action="#" @submit="savePlayer">
                <label class="form-field">
                    <label for="player-name" class="form-label">Nombre</label>
                    <input
                        class="form-control"
                        id="player-name"
                        v-model="editing.name"
                        type="text"
                        required
                    />
                </label>

                <div class="form-group">
                    <span class="form-label"
                        >Selección de equipos (máx.
                        {{ MAX_PLAYER_TEAMS }})</span
                    >
                    <div
                        v-if="!editTeamsData?.teams.length"
                        class="form-text mb-0"
                    >
                        No hay equipos habilitados para esa combinación.
                    </div>
                    <div v-else class="vstack gap-2">
                        <div
                            class="form-field"
                            v-for="team in editTeamsData?.teams"
                            :key="team.id"
                        >
                            <input
                                class="check"
                                type="checkbox"
                                :id="`team-${team.id}`"
                                :checked="team_ids.includes(team.id)"
                                :disabled="
                                    !team_ids.includes(team.id) &&
                                    team_ids.length >= MAX_PLAYER_TEAMS
                                "
                                @change="toggleTeam(team.id)"
                            />
                            <label :for="`team-${team.id}`">
                                {{ team.name }}
                            </label>
                        </div>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2">
                    <button
                        class="btn-outline theme-danger"
                        type="button"
                        v-if="editing.is_enabled"
                        @click="setPlayerEnabled(false)"
                    >
                        <Subtract />
                        <span>Deshabilitar</span>
                    </button>

                    <button
                        class="btn-outline theme-success"
                        type="button"
                        v-else
                        @click="setPlayerEnabled(true)"
                    >
                        <Checkmark />
                        <span>Habilitar</span>
                    </button>

                    <a
                        class="btn-outline theme-secondary ms-auto"
                        href="/teams"
                    >
                        Cancelar
                    </a>
                    <button class="btn-solid theme-primary">
                        Guardar cambios
                    </button>
                </div>
            </form>
        </template>
        <hr />
        <Gallery
            :photoError
            :currentPhotos
            :pendingPhotos
            :max="MAX_PHOTOS"
            editing
            @add="addPhoto"
            @delete="deletePhoto"
        />
    </div>
</template>
