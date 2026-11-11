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

const { isAdministrator } = useCurrentUser();

const readonly = computed(() => !isAdministrator.value);

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

const { data: activeSanctions } = await useAPI<PlayerSanctionListResponse>(
    () => `/players/${route.params.id}/sanctions`,
    { query: { status: "active" } },
);

const activeSanctionsList = computed(
    () => activeSanctions.value?.sanctions ?? [],
);

const hasActiveSanction = computed(() => activeSanctionsList.value.length > 0);

const activeRemainingMatches = computed(() =>
    activeSanctionsList.value.reduce(
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

// El catálogo de equipos solo lo puede consultar un administrador. Para el
// resto, la selección se reemplaza por los equipos del propio registro.
const { data: editTeamsData } = await useAPI<TeamsListResponse>("/teams", {
    query: computed(() => ({
        status: "enabled",
        sort: "name_asc",
        sport_id: editing.value?.sport.id,
        gender_category: editing.value?.gender,
    })),
    enabled: computed(() => editing.value !== null && isAdministrator.value),
});

const teamsLabel = computed(() =>
    isAdministrator.value
        ? `Selección de equipos (máx. ${MAX_PLAYER_TEAMS})`
        : "Equipos",
);

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
    if (!editing.value || readonly.value) return;
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
    if (readonly.value) return;
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

        <section
            class="card overflow-hidden mb-4 theme-warning"
            v-if="hasActiveSanction"
        >
            <div class="card-header hstack align-items-center gap-2">
                <h2 class="h6 mb-0 flex-grow-1">Sanciones activas</h2>
            </div>
            <div class="card-body vstack gap-2 p-0">
                <ul class="list-group list-group-flush">
                    <li
                        v-for="sanction in activeSanctionsList"
                        :key="sanction.id"
                        class="list-group-item"
                    >
                        <div class="d-flex flex-wrap align-items-center gap-2">
                            <NuxtLink
                                :to="{
                                    name: 'home-sport-sanctions-sanctionId',
                                    params: {
                                        sport: route.params.sport,
                                        sanctionId: sanction.id,
                                    },
                                }"
                            >
                                <strong>{{ sanction.title }}</strong>
                            </NuxtLink>

                            <span
                                class="badge badge-subtle theme-danger ms-auto"
                            >
                                Le restan
                                {{ sanction.remaining_matches }} de
                                {{ sanction.suspension_matches }}
                                {{
                                    sanction.suspension_matches === 1
                                        ? "fecha"
                                        : "fechas"
                                }}
                            </span>
                        </div>
                    </li>
                </ul>
            </div>
        </section>

        <form class="vstack gap-3" action="#" @submit="savePlayer">
            <label v-if="!readonly" class="form-field">
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
                <span class="form-label">{{ teamsLabel }}</span>
                <div
                    v-if="hasActiveSanction && !readonly"
                    class="alert theme-warning"
                    role="status"
                >
                    Sanción activa: no puede incorporarse a nuevos equipos hasta
                    cumplir
                    {{ activeRemainingMatches }}
                    {{ activeRemainingMatches === 1 ? "fecha" : "fechas" }}.
                    Puede quitarse de sus equipos actuales.
                </div>

                <!-- Administrador: selección editable del catálogo -->
                <template v-if="isAdministrator">
                    <div
                        v-if="!editTeamsData?.teams.length"
                        class="form-text mb-0"
                    >
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
                </template>

                <!-- Resto de los usuarios: solo los equipos del registro -->
                <template v-else>
                    <div v-if="!editing.teams.length" class="form-text mb-0">
                        Sin equipos asociados.
                    </div>
                    <ul v-else class="list-group">
                        <li
                            class="list-group-item"
                            v-for="team in editing.teams"
                            :key="team.id"
                        >
                            {{ team.name }}
                        </li>
                    </ul>
                </template>
            </div>
            <div class="alert theme-danger" role="alert" v-if="message">
                {{ message }}
            </div>
            <div v-if="!readonly" class="d-flex align-items-center gap-2">
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
            :readonly="readonly"
            editing
            @add="addPhoto"
            @delete="deletePhoto"
        />

        <hr />

        <SanctionHistory :player-id="editing.id" />
    </template>

    <p v-else>No se encontró el jugador.</p>
</template>
