<script setup lang="ts">
import {
    type PlayerResponse as Player,
    type TeamListResponse,
} from "~/utils/openapi";

const MAX_PLAYER_TEAMS = 3;

const { $api } = useNuxtApp();

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

function toggleTeam(team_ids: number[], id: number) {
    const index = team_ids.indexOf(id);

    if (index === -1) {
        if (team_ids.length >= MAX_PLAYER_TEAMS) return;
        team_ids.push(id);
    } else {
        team_ids.splice(index, 1);
    }
}

const canPickTeams = computed(() => Boolean(value.sport_id && value.gender));

const { data: teamsData } = await useAPI<TeamListResponse>("/teams", {
    query: computed(() => ({
        status: "enabled",
        sort: "name_asc",
        sport_id: value.sport_id,
        gender_category: value.gender,
    })),
    enabled: canPickTeams,
});
const { data: sportsData } = await useAPI<SportsListResponse>("/sports");

// team_id -> player_ids de los jugadores seleccionados.
const selectedTeams = ref<Record<number, number[]>>({});

const message = ref("");
const saving = ref(false);

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

function validate(): string | null {
    // if (!value.sport_id || !value.gender) {
    //     return "Seleccioná un deporte y un género.";
    // }
    // if (selectedTeamIds.value.length < MIN_COMPETITION_TEAMS) {
    //     return `Seleccioná al menos ${MIN_COMPETITION_TEAMS} equipos.`;
    // }
    return null;
}

// La selección de equipos deja de ser válida si cambian el deporte o el género.
watch(
    () => [value.sport_id, value.gender],
    () => {
        selectedTeams.value = {};
    },
);

async function addPlayer(ev: SubmitEvent) {
    ev.preventDefault();
    message.value = "";

    const validation = validate();
    if (validation) {
        message.value = validation;
        return;
    }
    saving.value = true;
    let player: Player;

    try {
        player = await $api<Player>("/players", {
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
        saving.value = false;
        return;
    }

    await navigateTo(`/players/${player.id}`);
}
</script>

<template>
    <div class="container p-4">
        <div class="alert theme-danger" role="alert" v-if="message">
            {{ message }}
        </div>

        <h1 class="h4 mb-3">Agregar jugador</h1>

        <form class="vstack gap-3" action="#" @submit="addPlayer">
            <div class="form-field">
                <label for="name" class="form-label">Nombre</label>
                <input
                    class="form-control"
                    id="name"
                    v-model="value.name"
                    type="text"
                    required
                />
            </div>
            <div class="row g-3">
                <div class="md:col-6 form-field">
                    <label for="sport_id" class="form-label"> Deporte </label>
                    <select
                        class="form-control"
                        id="sport_id"
                        v-model="value.sport_id"
                        required
                    >
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
                <div class="md:col-6 form-field">
                    <label for="gender" class="form-label">Género</label>
                    <select
                        class="form-control"
                        id="gender"
                        v-model="value.gender"
                        required
                    >
                        <option value="">Elegir género</option>
                        <option value="male">Masculino</option>
                        <option value="female">Femenino</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <span class="form-label">
                    Selección de equipos (máx. {{ MAX_PLAYER_TEAMS }})
                </span>
                <p v-if="!canPickCreateTeams" class="form-text mb-0">
                    Primero, seleccione deporte y género.
                </p>
                <p
                    v-else-if="!createTeamsData?.teams.length"
                    class="form-text mb-0"
                >
                    No hay equipos en esa categoría.
                </p>
                <div class="d-flex flex-wrap gap-2">
                    <div
                        class="form-field"
                        v-for="team in createTeamsData?.teams"
                        :key="team.id"
                    >
                        <input
                            class="check"
                            type="checkbox"
                            :id="`team-${team.id}`"
                            :checked="value.team_ids.includes(team.id)"
                            :disabled="
                                !value.team_ids.includes(team.id) &&
                                value.team_ids.length >= MAX_PLAYER_TEAMS
                            "
                            @change="toggleTeam(value.team_ids, team.id)"
                        />
                        <label :for="`team-${team.id}`">
                            {{ team.name }}
                        </label>
                    </div>
                </div>
            </div>

            <div class="d-flex align-items-center gap-2">
                <a class="btn-outline theme-secondary" href="/competitions">
                    Cancelar
                </a>
                <button
                    class="btn-solid theme-primary ms-auto"
                    :disabled="saving"
                >
                    Confirmar
                </button>
            </div>
        </form>
    </div>
</template>
