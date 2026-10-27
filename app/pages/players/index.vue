<script setup lang="ts">
import {
    type PlayerResponse as Player,
    type PlayerListResponse,
    type SportsListResponse,
    type TeamListResponse,
} from "~/utils/openapi";

import Filter from "~icons/fluent/filter-32-filled";
import Search from "~icons/fluent/search-48-filled";
import Add from "~icons/fluent/add-48-filled";

type PlayerStatus = "enabled" | "disabled" | "all";
type PlayerSort = "name_asc" | "created_at_desc";

const filters = reactive({
    search: "",
    sport_id: "" as number | "",
    gender: "" as Player["gender"] | "",
    team_id: "" as number | "",
    status: "enabled" as PlayerStatus,
    sort: "name_asc" as PlayerSort,
    page: 1,
});

const playersQuery = computed(() => {
    const query: Record<string, string | number> = {
        status: filters.status,
        sort: filters.sort,
        page: filters.page,
    };

    if (filters.search.trim()) query.search = filters.search.trim();
    if (filters.sport_id) query.sport_id = filters.sport_id;
    if (filters.gender) query.gender = filters.gender;
    if (filters.team_id) query.team_id = filters.team_id;

    return query;
});

const { data } = await useAPI<PlayerListResponse>("/players", {
    query: playersQuery,
});

const { data: sportsData } = await useAPI<SportsListResponse>("/sports");

// Los equipos del filtro se acotan al deporte y al género elegidos.
const filterTeamsQuery = computed(() => {
    const query: Record<string, string | number> = {
        status: "enabled",
        sort: "name_asc",
    };

    if (filters.sport_id) query.sport_id = filters.sport_id;
    if (filters.gender) query.gender_category = filters.gender;

    return query;
});

const { data: filterTeamsData } = await useAPI<TeamListResponse>("/teams", {
    query: filterTeamsQuery,
});

const message = ref("");

function genderLabel(gender: Player["gender"]) {
    return gender === "male" ? "Masculino" : "Femenino";
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString();
}

// Cambiar un filtro vuelve a la primera página del listado.
watch(
    () => [
        filters.search,
        filters.sport_id,
        filters.gender,
        filters.team_id,
        filters.status,
        filters.sort,
    ],
    () => {
        filters.page = 1;
    },
);

// El equipo elegido deja de ser válido si cambian el deporte o el género.
watch(
    () => [filters.sport_id, filters.gender],
    () => {
        filters.team_id = "";
    },
);

function goToPage(page: number) {
    filters.page = page;
}
</script>

<template>
    <div class="container p-4">
        <div class="d-flex align-items-center mb-3">
            <h1 class="h4 mb-0">Jugadores</h1>
            <a
                class="btn-solid btn-styled theme-accent ms-auto"
                href="/players/new"
                aria-label="Agregar nuevo"
            >
                <Add />
                Nuevo
            </a>
        </div>

        <p class="notification is-danger" v-if="message">{{ message }}</p>

        <form class="mb-3 search is-flex" action="#" @submit.prevent>
            <div class="hstack gap-2" role="search">
                <button
                    class="btn-solid btn-styled btn-icon theme-primary"
                    type="button"
                    data-bs-toggle="dialog"
                    data-bs-target="#more-filters"
                    aria-label="Expandir filtros"
                >
                    <Filter />
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
                        <Filter class="me-2" />
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
                        <label for="filters-sport_id" class="form-label">
                            Deporte
                        </label>
                        <select
                            class="form-control"
                            id="filters-sport_id"
                            v-model="filters.sport_id"
                        >
                            <option value="">Todos</option>
                            <option
                                v-for="sport in sportsData?.sports"
                                :key="sport.id"
                                :value="sport.id"
                            >
                                {{ sport.name }}
                            </option>
                        </select>
                    </div>
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
            <a
                class="cell player card text-decoration-none"
                v-for="player in data.players"
                :href="`/players/${player.id}`"
                :key="player.id"
            >
                <!-- <td>
                {{ player.id }}
            </td> -->
                <div class="card-body">
                    <h4 class="card-title">
                        <span class="pr-2">
                            {{ player.name }}
                        </span>
                    </h4>

                    <!-- <button -->
                    <!--     class="card-header-icon" -->
                    <!--     aria-label="Editar" -->
                    <!--     v-if="player.is_enabled" -->
                    <!--     @click="startEdit(player)" -->
                    <!-- > -->
                    <!--     <span class="icon"> -->
                    <!--         <Edit /> -->
                    <!--     </span> -->
                    <!-- </button> -->
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
            </a>
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

#more-filters {
    &:popover-open {
        display: grid;
    }

    grid-template-columns: auto 1fr;
    gap: 0.5rem;

    & .label {
        text-align: right;
        margin: 0;
    }

    & .field {
        display: grid;
        grid-column: span 2;
        grid-template-columns: subgrid;
        justify-items: stretch;
        align-items: center;
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
