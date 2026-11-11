<script setup lang="ts">
import {
    type PlayerResponse as Player,
    type PlayerListResponse,
    type TeamListResponse,
} from "~/utils/openapi";

import { IconAdd, IconFilter } from "~/assets/icons";

type PlayerStatus = "enabled" | "disabled" | "all";
type PlayerSort = "name_asc" | "created_at_desc";

const route = useRoute();

const { isAdministrator } = useCurrentUser();

const {
    public: { apiBase },
} = useRuntimeConfig();

const filters = reactive({
    search: "",
    gender: "" as Player["gender"] | "",
    team_id: "" as number | "",
    status: "enabled" as PlayerStatus,
    sort: "name_asc" as PlayerSort,
    page: 1,
});

const playersQuery = computed(() => {
    const query: Record<string, string | number> = {
        sport_id: route.params.sport,
        status: filters.status,
        sort: filters.sort,
        page: filters.page,
    };

    if (filters.search.trim()) query.search = filters.search.trim();
    if (filters.gender) query.gender = filters.gender;
    if (filters.team_id) query.team_id = filters.team_id;

    return query;
});

const { data } = await useAPI<PlayerListResponse>("/players", {
    query: playersQuery,
});

// Los equipos del filtro se acotan al deporte y al género elegidos.
const filterTeamsQuery = computed(() => {
    const query: Record<string, string | number> = {
        sport_id: route.params.sport,
        status: "enabled",
        sort: "name_asc",
    };

    if (filters.gender) query.gender_category = filters.gender;

    return query;
});

const { data: filterTeamsData } = await useAPI<TeamListResponse>("/teams", {
    query: filterTeamsQuery,
});

function genderLabel(gender: Player["gender"]) {
    return gender === "male" ? "Masculino" : "Femenino";
}

// Cambiar un filtro vuelve a la primera página del listado.
watch(
    () => [
        filters.search,
        filters.gender,
        filters.team_id,
        filters.status,
        filters.sort,
    ],
    () => {
        filters.page = 1;
    },
);

// El equipo elegido deja de ser válido si cambia el género.
watch(
    () => filters.gender,
    () => {
        filters.team_id = "";
    },
);

function goToPage(page: number) {
    filters.page = page;
}
</script>

<template>
    <div>
        <div class="d-flex align-items-center mb-4">
            <h2 class="h2 fw-light m-0">Jugadores</h2>
            <NuxtLink
                v-if="isAdministrator"
                class="btn-solid rounded-pill ms-auto"
                :to="{
                    name: 'home-sport-players-new',
                    params: { sport: route.params.sport },
                }"
                aria-label="Agregar nuevo"
            >
                <IconAdd />
                Nuevo
            </NuxtLink>
        </div>

        <form class="mb-3 search" action="#" @submit.prevent>
            <div class="hstack gap-2" role="search">
                <button
                    class="btn-solid btn-styled btn-icon theme-primary"
                    type="button"
                    data-bs-toggle="dialog"
                    data-bs-target="#more-filters"
                    aria-label="Expandir filtros"
                >
                    <IconFilter />
                </button>
                <input
                    class="form-control"
                    type="search"
                    v-model="filters.search"
                    placeholder="Buscar por nombre"
                    aria-label="Buscar por nombre"
                />
            </div>

            <dialog id="more-filters" class="dialog">
                <div class="dialog-header">
                    <h1 class="dialog-title">
                        <IconFilter class="me-2" />
                        Filtros
                    </h1>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="dialog"
                        aria-label="Close"
                    ></button>
                </div>
                <div class="dialog-body d-flex flex-column gap-3">
                    <div class="form-field">
                        <label for="filters-gender" class="form-label">
                            Género
                        </label>
                        <select
                            class="form-control"
                            id="filters-gender"
                            v-model="filters.gender"
                        >
                            <option value="">Todos</option>
                            <option value="male">Masculino</option>
                            <option value="female">Femenino</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="filters-team_id" class="form-label">
                            Equipo
                        </label>
                        <select
                            class="form-control"
                            id="filters-team_id"
                            v-model="filters.team_id"
                        >
                            <option value="">Todos</option>
                            <option
                                v-for="team in filterTeamsData?.teams"
                                :key="team.id"
                                :value="team.id"
                            >
                                {{ team.name }}
                            </option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="filters-status" class="form-label">
                            Estado
                        </label>
                        <select
                            class="form-control"
                            id="filters-status"
                            v-model="filters.status"
                        >
                            <option value="enabled">Habilitados</option>
                            <option value="disabled">Deshabilitados</option>
                            <option value="all">Todos</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label id="filters-sort-label" class="form-label">
                            Ordenar por
                        </label>
                        <div
                            class="btn-group"
                            role="group"
                            aria-labelledby="filters-sort-label"
                        >
                            <label class="btn-check btn-outline theme-primary">
                                <input
                                    type="radio"
                                    autocomplete="off"
                                    value="name_asc"
                                    v-model="filters.sort"
                                />
                                Nombre (A-Z)
                            </label>
                            <label class="btn-check btn-outline theme-primary">
                                <input
                                    type="radio"
                                    autocomplete="off"
                                    value="created_at_desc"
                                    v-model="filters.sort"
                                />
                                Más reciente
                            </label>
                        </div>
                    </div>
                </div>
            </dialog>
        </form>

        <div class="player-grid" v-if="data">
            <NuxtLink
                class="cell player card text-decoration-none"
                v-for="player in data.players"
                :to="{
                    name: 'home-sport-players-id',
                    params: { sport: route.params.sport, id: player.id },
                }"
                :key="player.id"
            >
                <div class="card-body">
                    <h4 class="card-title">
                        <img
                            v-if="player.primary_photo_path"
                            class="avatar me-4"
                            style="border: none"
                            :src="apiBase + player.primary_photo_path"
                        />
                        <div v-else class="avatar me-4">
                            {{ avatarLetters(player.name) }}
                        </div>
                        <span class="pr-2">
                            {{ player.name }}
                        </span>
                    </h4>

                    <div>
                        <strong>
                            {{ player.sport.name }}
                            {{ genderLabel(player.gender) }}
                        </strong>
                        en
                        {{
                            player.teams.map((team) => team.name).join(", ") ||
                            "-"
                        }}
                    </div>
                </div>

                <div class="card-footer d-flex justify-content-between">
                    <small class="fg-2">
                        Registrado {{ formatDate(player.created_at) }}
                    </small>
                    <small class="fg-2">
                        {{ player.is_enabled ? "Habilitado" : "Deshabilitado" }}
                    </small>
                </div>
            </NuxtLink>
        </div>
        <p v-else>Hubo un problema para cargar los datos</p>

        <nav
            class="d-flex flex-wrap align-items-center gap-2"
            v-if="data && data.pagination.total_pages > 1"
            aria-label="Paginación de jugadores"
        >
            <ul class="pagination mb-0">
                <li
                    class="page-item"
                    :class="{ disabled: data.pagination.page <= 1 }"
                >
                    <button
                        class="page-link"
                        type="button"
                        :disabled="data.pagination.page <= 1"
                        @click="goToPage(data.pagination.page - 1)"
                    >
                        Anterior
                    </button>
                </li>
                <li
                    class="page-item"
                    :class="{
                        disabled:
                            data.pagination.page >= data.pagination.total_pages,
                    }"
                >
                    <button
                        class="page-link"
                        type="button"
                        :disabled="
                            data.pagination.page >= data.pagination.total_pages
                        "
                        @click="goToPage(data.pagination.page + 1)"
                    >
                        Siguiente
                    </button>
                </li>
            </ul>
            <p class="mb-0 fg-2">
                Página {{ data.pagination.page }} de
                {{ data.pagination.total_pages }} ({{
                    data.pagination.total_items
                }}
                jugadores)
            </p>
        </nav>
    </div>
</template>

<style>
.search {
    display: flex;
    gap: 1rem;

    .control {
        flex-grow: 1;
    }
}

.player {
    height: 100%;
}

.player-grid {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(auto-fill, minmax(24rem, 1fr));
}

.sideside {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;

    .field {
        width: 100%;
        .select {
            width: 100%;
        }
    }
}
</style>
