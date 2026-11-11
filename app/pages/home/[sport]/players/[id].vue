<script setup lang="ts">
import {
    type TeamsListResponse,
    type PlayerResponse as Player,
    type PlayerPhotoListResponse,
    type PlayerSanctionListResponse,
} from "~/utils/openapi";

import {
    IconArrowLeft,
    IconCheckmarkCircle,
    IconSubtract,
} from "~/assets/icons";
import Gallery from "~/components/Gallery.vue";
import SanctionHistory from "~/components/SanctionHistory.vue";

const route = useRoute();

const {
    public: { apiBase },
} = useRuntimeConfig();

const {
    data: editing,
    pending,
    error,
    refresh,
} = await useAPI<Player>(() => `/players/${route.params.id}`);

const { data: photos, refresh: refreshPhotos } =
    await useAPI<PlayerPhotoListResponse>(
        () => `/players/${route.params.id}/photos`,
    );

const { data: activeSanctions, refresh: refreshActiveSanctions } =
    await useAPI<PlayerSanctionListResponse>(
        () => `/players/${route.params.id}/sanctions`,
        { query: { status: "active" } },
    );

const hasActiveSanction = computed(
    () => (activeSanctions.value?.sanctions.length ?? 0) > 0,
);

const activeRemainingMatches = computed(() =>
    (activeSanctions.value?.sanctions ?? []).reduce(
        (total, sanction) => total + sanction.remaining_matches,
        0,
    ),
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

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

function genderLabel(gender: Player["gender"]) {
    return gender === "male" ? "Masculino" : "Femenino";
}

const team_ids = computed(
    () => editing.value?.teams.map((team) => team.id) ?? [],
);

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
    <NuxtLink
        class="d-flex align-items-center gap-1 text-decoration-none mb-3"
        :to="{
            name: 'home-sport-players',
            params: { sport: route.params.sport },
        }"
    >
        <IconArrowLeft />
        <span>Volver al listado</span>
    </NuxtLink>

    <p v-if="pending">Cargando jugador...</p>

    <div v-else-if="error" class="alert theme-danger" role="alert">
        No se pudo cargar el jugador.
    </div>

    <template v-else-if="editing">
        <div class="d-flex flex-wrap align-items-start gap-2">
            <h1 class="h2 fw-light m-0 flex-grow-1">{{ editing.name }}</h1>
            <span
                v-if="hasActiveSanction"
                class="badge badge-subtle theme-danger"
            >
                Sancionado
            </span>
            <span
                class="badge badge-subtle"
                :class="editing.is_enabled ? 'theme-success' : 'theme-danger'"
            >
                {{ editing.is_enabled ? "Habilitado" : "Deshabilitado" }}
            </span>
        </div>

        <hr />

        <form class="vstack gap-3" action="#" @submit="savePlayer">
            <label class="form-field">
                <span class="form-label">Nombre</span>
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
                    >Selección de equipos (máx. {{ MAX_PLAYER_TEAMS }})</span
                >
                <div
                    v-if="hasActiveSanction"
                    class="alert theme-warning"
                    role="status"
                >
                    Sanción activa: no puede incorporarse a nuevos equipos hasta
                    cumplir
                    {{ activeRemainingMatches }}
                    {{ activeRemainingMatches === 1 ? "fecha" : "fechas" }}.
                    Puede quitarse de sus equipos actuales.
                </div>
                <div v-if="!editTeamsData?.teams.length" class="form-text mb-0">
                    No hay equipos habilitados para esa combinación.
                </div>
                <ul v-else class="list-group">
                    <li
                        class="list-group-item"
                        v-for="team in editTeamsData?.teams"
                        :key="team.id"
                    >
                        <div class="form-field">
                            <input
                                class="check"
                                type="checkbox"
                                :id="`team-${team.id}`"
                                :checked="team_ids.includes(team.id)"
                                :disabled="
                                    !team_ids.includes(team.id) &&
                                    (team_ids.length >= MAX_PLAYER_TEAMS ||
                                        hasActiveSanction)
                                "
                                @change="toggleTeam(team.id)"
                            />
                            <label
                                class="stretched-link"
                                :for="`team-${team.id}`"
                            >
                                {{ team.name }}
                            </label>
                        </div>
                    </li>
                </ul>
            </div>
            <div class="alert theme-danger" role="alert" v-if="message">
                {{ message }}
            </div>
            <div class="d-flex align-items-center gap-2">
                <button
                    class="btn-outline theme-danger"
                    type="button"
                    v-if="editing.is_enabled"
                    @click="setPlayerEnabled(false)"
                >
                    <IconSubtract />
                    <span>Deshabilitar</span>
                </button>

                <button
                    class="btn-outline theme-success"
                    type="button"
                    v-else
                    @click="setPlayerEnabled(true)"
                >
                    <IconCheckmarkCircle />
                    <span>Habilitar</span>
                </button>

                <button class="ms-auto btn-solid theme-primary">
                    Actualizar datos
                </button>
            </div>
        </form>
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

        <hr />

        <SanctionHistory
            :player-id="editing.id"
            @changed="refreshActiveSanctions"
        />
    </template>

    <p v-else>No se encontró el jugador.</p>
</template>
