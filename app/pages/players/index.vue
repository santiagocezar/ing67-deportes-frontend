<script setup lang="ts">
import {
    type TeamsListResponse,
    type PlayerResponse as Player,
    type PlayerListResponse,
    type SportsListResponse,
    type TeamListResponse,
} from "~/utils/openapi";

import Options from "~icons/fluent/options-48-filled";
import Search from "~icons/fluent/search-48-filled";

type PlayerStatus = "enabled" | "disabled" | "all";
type PlayerSort = "name_asc" | "created_at_desc";

interface PlayerTeam {
    id: number;
    name: string;
}

// interface Player {
//     id: number;
//     name: string;
//     sport: Sport;
//     gender: Gender;
//     teams: PlayerTeam[];
//     is_enabled: boolean;
//     created_at: string
//     disabled_at: string | null;
// }

const MAX_PLAYER_TEAMS = 3;

const { $api } = useNuxtApp();

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

const { data, refresh } = await useAPI<PlayerListResponse>("/players", {
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

const value = reactive<{
    name: string;
    sport_id: number | "";
    gender: Player["gender"] | "";
    team_ids: number[];
}>({
    name: "",
    sport_id: "",
    gender: "",
    team_ids: [],
});

const canPickCreateTeams = computed(() =>
    Boolean(value.sport_id && value.gender),
);

const { data: createTeamsData } = await useAPI<TeamListResponse>("/teams", {
    query: computed(() => ({
        status: "enabled",
        sort: "name_asc",
        sport_id: value.sport_id,
        gender_category: value.gender,
    })),
    enabled: canPickCreateTeams,
});

const editing = ref<Player | null>(null);
const edited = reactive<{ name: string; team_ids: number[] }>({
    name: "",
    team_ids: [],
});

const { data: editTeamsData } = await useAPI<TeamListResponse>("/teams", {
    query: computed(() => ({
        status: "enabled",
        sort: "name_asc",
        sport_id: editing.value?.sport.id,
        gender_category: editing.value?.gender,
    })),
    enabled: computed(() => editing.value !== null),
});

const message = ref("");

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

function genderLabel(gender: Player["gender"]) {
    return gender === "male" ? "Masculino" : "Femenino";
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString();
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

watch(
    () => [value.sport_id, value.gender],
    () => {
        value.team_ids = [];
    },
);

async function addPlayer(ev: SubmitEvent) {
    ev.preventDefault();
    message.value = "";

    try {
        await $api("/players", {
            method: "POST",
            body: {
                name: value.name,
                sport_id: value.sport_id,
                gender: value.gender,
                team_ids: [...value.team_ids],
            },
        });
    } catch (error) {
        reportError(error);
        return;
    }

    value.name = "";
    value.sport_id = "";
    value.gender = "";
    value.team_ids = [];
    refresh();
}

async function startEdit(player: Player) {
    message.value = "";

    try {
        // Se relee el jugador para editar sobre el estado actual.
        const current = await $api<Player>(`/players/${player.id}`);

        editing.value = current;
        edited.name = current.name;
        edited.team_ids = current.teams.map((team) => team.id);
    } catch (error) {
        reportError(error);
    }
}

function cancelEdit() {
    editing.value = null;
    edited.name = "";
    edited.team_ids = [];
}

function goToPage(page: number) {
    filters.page = page;
}
</script>

<template>
    <p class="notification is-danger" v-if="message">{{ message }}</p>

    <form action="#" @submit="addPlayer">
        <label class="field">
            <span class="label">Nombre</span>
            <input class="input" v-model="value.name" type="text" required />
        </label>
        <br />
        <label class="field">
            <span class="label">Deporte</span>
            <div class="select">
                <select v-model="value.sport_id" required>
                    <option value="">Elegir deporte</option>
                    <option
                        v-for="sport in sportsData?.sports"
                        :key="sport.id"
                        :value="sport.id"
                    >
                        {{ sport.name }}
                    </option>
                </select>
            </div>
        </label>
        <br />
        <label class="field">
            <span class="label">Género</span>
            <div class="select">
                <select v-model="value.gender" required>
                    <option value="">Elegir género</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                </select>
            </div>
        </label>
        <br />
        <div class="field">
            <span class="label">Equipos (hasta {{ MAX_PLAYER_TEAMS }})</span>
            <p v-if="!canPickCreateTeams">
                Elegí un deporte y un género para ver los equipos.
            </p>
            <p v-else-if="!createTeamsData?.teams.length">
                No hay equipos habilitados para esa combinación.
            </p>
            <label
                class="checkbox"
                v-for="team in createTeamsData?.teams"
                :key="team.id"
            >
                <input
                    type="checkbox"
                    :checked="value.team_ids.includes(team.id)"
                    :disabled="
                        !value.team_ids.includes(team.id) &&
                        value.team_ids.length >= MAX_PLAYER_TEAMS
                    "
                    @change="toggleTeam(value.team_ids, team.id)"
                />
                {{ team.name }}
            </label>
        </div>
        <br />
        <button class="button is-primary">Agregar jugador</button>
    </form>

    <hr />

    <form class="filters" action="#" @submit.prevent>
        <div class="search">
            <p class="control has-icons-left">
                <input
                    class="input"
                    v-model="filters.search"
                    type="search"
                    placeholder="Buscar por nombre"
                />
                <span class="icon is-left">
                    <Search />
                </span>
            </p>

            <button class="button" type="button" popovertarget="more-filters">
                <Options />
            </button>
        </div>

        <dialog popover id="more-filters" class="card is-primary">
            <label class="field">
                <span class="label">Deporte</span>
                <div class="select">
                    <select v-model="filters.sport_id">
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
            </label>
            <label class="field">
                <span class="label">Género</span>
                <div class="select">
                    <select v-model="filters.gender">
                        <option value="">Todos</option>
                        <option value="male">Masculino</option>
                        <option value="female">Femenino</option>
                    </select>
                </div>
            </label>
            <label class="field">
                <span class="label">Equipo</span>
                <div class="select">
                    <select v-model="filters.team_id">
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
            </label>
            <br />
            <label class="field">
                <span class="label">Estado</span>
                <div class="select">
                    <select v-model="filters.status">
                        <option value="enabled">Habilitados</option>
                        <option value="disabled">Deshabilitados</option>
                        <option value="all">Todos</option>
                    </select>
                </div>
            </label>
            <label class="field">
                <span class="label">Orden</span>
                <div class="select">
                    <select v-model="filters.sort">
                        <option value="name_asc">Nombre (A-Z)</option>
                        <option value="created_at_desc">Más recientes</option>
                    </select>
                </div>
            </label>
        </dialog>
    </form>

    <div class="player-grid" v-if="data">
        <a
            class="cell player card"
            v-for="player in data.players"
            :href="`/players/${player.id}`"
            :key="player.id"
        >
            <!-- <td>
                {{ player.id }}
            </td> -->
            <header class="card-header">
                <p class="card-header-title">
                    <span class="pr-2">
                        {{ player.name }}
                    </span>
                    <span class="has-text-weight-light">
                        {{ player.sport.name }} ·
                        {{ genderLabel(player.gender) }}
                    </span>
                </p>

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
            </header>
            <div class="card-content pl-4 pb-4 pr-4 pt-0">
                <p>
                    <strong>Juega en</strong>

                    {{
                        player.teams.map((team) => team.name).join(", ") || "-"
                    }}
                </p>
                <p>
                    {{ player.is_enabled ? "Habilitado" : "Deshabilitado" }}
                </p>
                <p>
                    <small>
                        Registrado {{ formatDate(player.created_at) }}
                    </small>
                </p>
            </div>
            <!-- <footer class="card-footer">
                <a href="#" class="card-footer-item">Save</a>
                <a href="#" class="card-footer-item">Edit</a>
                <a href="#" class="card-footer-item">Delete</a>
            </footer> -->
        </a>
    </div>
    <p v-else>Hubo un problema para cargar los datos</p>

    <nav class="pagination" v-if="data && data.pagination.total_pages > 1">
        <button
            class="pagination-previous"
            :disabled="data.pagination.page <= 1"
            @click="goToPage(data.pagination.page - 1)"
        >
            Anterior
        </button>
        <button
            class="pagination-next"
            :disabled="data.pagination.page >= data.pagination.total_pages"
            @click="goToPage(data.pagination.page + 1)"
        >
            Siguiente
        </button>
        <p class="pagination-list">
            Página {{ data.pagination.page }} de
            {{ data.pagination.total_pages }} ({{ data.pagination.total_items }}
            jugadores)
        </p>
    </nav>

    <div class="modal is-active" v-if="editing">
        <div class="modal-background" @click="cancelEdit"></div>
        <div class="modal-content"></div>
        <button class="modal-close is-large" @click="cancelEdit"></button>
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
</style>
