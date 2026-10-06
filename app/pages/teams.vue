<script setup lang="ts">
import type {
    SportListResponse,
    SportResponse,
    TeamCreateRequest,
    TeamListResponse,
    TeamResponse,
} from "~/utils/openapi";

type Gender = "male" | "female";
type TeamStatus = "enabled" | "disabled" | "all";
type TeamSort = "name_asc" | "created_at_desc";

const { $api } = useNuxtApp();

const filters = reactive({
    search: "",
    sport_id: "" as number | "",
    gender_category: "" as Gender | "",
    status: "enabled" as TeamStatus,
    sort: "name_asc" as TeamSort,
    page: 1,
});

const teamsQuery = computed(() => {
    const query: Record<string, string | number> = {
        status: filters.status,
        sort: filters.sort,
        page: filters.page,
    };

    if (filters.search.trim()) query.search = filters.search.trim();
    if (filters.sport_id) query.sport_id = filters.sport_id;
    if (filters.gender_category)
        query.gender_category = filters.gender_category;

    return query;
});

const { data, refresh } = await useAPI<TeamListResponse>("/teams", {
    query: teamsQuery,
});
const { data: sportsData } = await useAPI<SportListResponse>("/sports");

const value = reactive({
    name: "",
    gender_category: "female" as TeamCreateRequest["gender_category"],
    sport: undefined as SportResponse | undefined,
});

const editing = ref<TeamResponse | null>(null);
const edited = reactive<{ name: string }>({
    name: "",
});

const message = ref("");

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

function genderLabel(gender: Gender) {
    return gender === "male" ? "Masculino" : "Femenino";
}

// Cambiar un filtro vuelve a la primera página del listado.
watch(
    () => [
        filters.search,
        filters.sport_id,
        filters.gender_category,
        filters.status,
        filters.sort,
    ],
    () => {
        filters.page = 1;
    },
);

async function addTeam(ev: SubmitEvent) {
    ev.preventDefault();
    message.value = "";

    try {
        await $api("/teams", {
            method: "POST",
            body: {
                name: value.name,
                gender_category: value.gender_category,
                sport_id: value.sport?.id!,
            } satisfies TeamCreateRequest,
        });
    } catch (error) {
        reportError(error);
        return;
    }

    value.name = "";
    value.gender_category = "female";
    value.sport = undefined;
    refresh();
}

function startEdit(team: TeamResponse) {
    message.value = "";
    editing.value = team;
    edited.name = team.name;
}

function cancelEdit() {
    editing.value = null;
    edited.name = "";
}

async function saveTeam(ev: SubmitEvent) {
    ev.preventDefault();
    if (!editing.value) return;
    message.value = "";

    try {
        await $api(`/teams/${editing.value.id}`, {
            method: "PUT",
            body: {
                name: edited.name,
            },
        });
    } catch (error) {
        reportError(error);
        return;
    }

    cancelEdit();
    refresh();
}

async function setTeamEnabled(team: TeamResponse, enabled: boolean) {
    message.value = "";

    try {
        await $api(`/teams/${team.id}/${enabled ? "enable" : "disable"}`, {
            method: "PATCH",
        });
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

    <form action="#" @submit="addTeam">
        <label class="field">
            <span class="label">Nombre</span>
            <input class="input" v-model="value.name" type="text" required />
        </label>
        <label class="field">
            <span class="label">Categoría de género</span>
            <select class="input" v-model="value.gender_category" required>
                <option value="" disabled>Seleccioná una categoría</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
            </select>
        </label>
        <label class="field">
            <span class="label">Deporte</span>
            <select class="input" v-model="value.sport" required>
                <option :value="undefined" disabled>
                    Seleccioná un deporte
                </option>
                <option
                    v-for="sport in sportsData?.sports"
                    :key="sport.id"
                    :value="sport"
                >
                    {{ sport.name }}
                </option>
            </select>
        </label>
        <button class="button is-primary">Agregar equipo</button>
    </form>

    <hr />

    <form class="filters" action="#" @submit.prevent>
        <label class="field">
            <span class="label">Buscar</span>
            <input
                class="input"
                v-model="filters.search"
                type="search"
                placeholder="Nombre del equipo"
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
                <select v-model="filters.gender_category">
                    <option value="">Todos</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
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
                <th>Categoría</th>
                <th>Deporte</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="team in data.teams" :key="team.id">
                <td>{{ team.id }}</td>
                <td>{{ team.name }}</td>
                <td>{{ genderLabel(team.gender_category) }}</td>
                <td>{{ team.sport?.name }}</td>
                <td>
                    {{ team.is_enabled ? "Habilitado" : "Deshabilitado" }}
                </td>
                <td>
                    <button
                        class="button is-small"
                        v-if="team.is_enabled"
                        @click="startEdit(team)"
                    >
                        Editar
                    </button>
                    <button
                        class="button is-small is-danger"
                        v-if="team.is_enabled"
                        @click="setTeamEnabled(team, false)"
                    >
                        Deshabilitar
                    </button>
                    <button
                        class="button is-small is-success"
                        v-else
                        @click="setTeamEnabled(team, true)"
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
            {{ data.pagination.total_pages }} ({{ data.pagination.total_items }}
            equipos)
        </p>
    </nav>

    <div class="modal is-active" v-if="editing">
        <div class="modal-background" @click="cancelEdit"></div>
        <div class="modal-content">
            <form class="box" action="#" @submit="saveTeam">
                <p class="title is-5">Editar equipo #{{ editing.id }}</p>
                <p>
                    {{ editing.sport?.name }} ·
                    {{ genderLabel(editing.gender_category) }}
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
                <button class="button is-primary">Guardar cambios</button>
                <button class="button" type="button" @click="cancelEdit">
                    Cancelar
                </button>
            </form>
        </div>
        <button class="modal-close is-large" @click="cancelEdit"></button>
    </div>
</template>

<style>
.filters {
    display: flex;
    gap: 0.5rem;
}
</style>
