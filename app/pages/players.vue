<script setup lang="ts">
type Gender = "male" | "female";
type PlayerStatus = "enabled" | "disabled" | "all";
type PlayerSort = "name_asc" | "created_at_desc";

interface APIPlayers {
    players: Player[];
    pagination: Pagination;
}

interface APISports {
    sports: Sport[];
}

interface APITeams {
    teams: Team[];
    pagination: Pagination;
}

interface Pagination {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
}

interface Sport {
    id: number;
    max_players: number;
    max_players_in_game: number;
    name: string;
}

interface Team {
    id: number;
    name: string;
    sport: Sport;
    gender_category: Gender;
    is_enabled: boolean;
}

interface PlayerTeam {
    id: number;
    name: string;
}

interface Player {
    id: number;
    name: string;
    sport: Sport;
    gender: Gender;
    teams: PlayerTeam[];
    is_enabled: boolean;
    created_at: string;
    disabled_at: string | null;
}

const MAX_PLAYER_TEAMS = 3;

const { $api } = useNuxtApp();

const filters = reactive({
    search: "",
    sport_id: "" as number | "",
    gender: "" as Gender | "",
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

const { data, refresh } = await useAPI<APIPlayers>("/players", {
    query: playersQuery,
});
const { data: sportsData } = await useAPI<APISports>("/sports");

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

const { data: filterTeamsData } = await useAPI<APITeams>("/teams", {
    query: filterTeamsQuery,
});

const value = reactive<{
    name: string;
    sport_id: number | "";
    gender: Gender | "";
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

const { data: createTeamsData } = await useAPI<APITeams>("/teams", {
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

const { data: editTeamsData } = await useAPI<APITeams>("/teams", {
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

function genderLabel(gender: Gender) {
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
        await $api(
            `/players/${player.id}/${enabled ? "enable" : "disable"}`,
            { method: "PATCH" },
        );
    } catch (error) {
        reportError(error);
        return;
    }

    refresh();
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

    <form action="#" @submit.prevent>
        <label class="field">
            <span class="label">Buscar</span>
            <input
                class="input"
                v-model="filters.search"
                type="search"
                placeholder="Nombre del jugador"
            />
        </label>
        <br />
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
        <br />
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
        <br />
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
        <br />
        <label class="field">
            <span class="label">Orden</span>
            <div class="select">
                <select v-model="filters.sort">
                    <option value="name_asc">Nombre (A-Z)</option>
                    <option value="created_at_desc">Más recientes</option>
                </select>
            </div>
        </label>
    </form>

    <table class="table" v-if="data">
        <thead>
            <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Deporte</th>
                <th>Género</th>
                <th>Equipos</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="player in data.players" :key="player.id">
                <td>
                    {{ player.id }}
                </td>
                <td>
                    {{ player.name }}
                </td>
                <td>
                    {{ player.sport.name }}
                </td>
                <td>
                    {{ genderLabel(player.gender) }}
                </td>
                <td>
                    {{
                        player.teams.map((team) => team.name).join(", ") || "-"
                    }}
                </td>
                <td>
                    {{ player.is_enabled ? "Habilitado" : "Deshabilitado" }}
                </td>
                <td>
                    {{ formatDate(player.created_at) }}
                </td>
                <td>
                    <button
                        class="button is-small"
                        v-if="player.is_enabled"
                        @click="startEdit(player)"
                    >
                        Editar
                    </button>
                    <button
                        class="button is-small is-danger"
                        v-if="player.is_enabled"
                        @click="setPlayerEnabled(player, false)"
                    >
                        Deshabilitar
                    </button>
                    <button
                        class="button is-small is-success"
                        v-else
                        @click="setPlayerEnabled(player, true)"
                    >
                        Habilitar
                    </button>
                </td>
            </tr>
        </tbody>
    </table>
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
            {{ data.pagination.total_pages }} ({{
                data.pagination.total_items
            }}
            jugadores)
        </p>
    </nav>

    <div class="modal is-active" v-if="editing">
        <div class="modal-background" @click="cancelEdit"></div>
        <div class="modal-content">
            <form class="box" action="#" @submit="savePlayer">
                <p class="title is-5">Editar jugador #{{ editing.id }}</p>
                <p>
                    {{ editing.sport.name }} ·
                    {{ genderLabel(editing.gender) }}
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
        </div>
        <button class="modal-close is-large" @click="cancelEdit"></button>
    </div>
</template>
