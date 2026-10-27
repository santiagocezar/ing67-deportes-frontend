<script setup lang="ts">
import {
    type CompetitionDetailResponse,
    type RefereeListResponse,
    type SportListResponse,
    type TeamListResponse,
} from "~/utils/openapi";

type Gender = "male" | "female";

const MIN_COMPETITION_TEAMS = 4;
const MAX_COMPETITION_TEAMS = 16;

const { $api } = useNuxtApp();

const { data: sportsData } = await useAPI<SportListResponse>("/sports");
const { data: refereesData } = await useAPI<RefereeListResponse>("/referees");

const value = reactive<{
    name: string;
    sport_id: number | "";
    gender: Gender | "";
    starts_at: string;
    ends_at: string;
    referee_ids: number[];
}>({
    name: "",
    sport_id: "",
    gender: "",
    starts_at: "",
    ends_at: "",
    referee_ids: [],
});

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

// team_id -> player_ids de los jugadores seleccionados.
const selectedTeams = ref<Record<number, number[]>>({});

const selectedTeamIds = computed(() =>
    Object.keys(selectedTeams.value).map(Number),
);

const message = ref("");
const saving = ref(false);

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

function toggleReferee(id: number) {
    const index = value.referee_ids.indexOf(id);
    if (index === -1) value.referee_ids.push(id);
    else value.referee_ids.splice(index, 1);
}

function validate(): string | null {
    if (!value.sport_id || !value.gender) {
        return "Seleccioná un deporte y un género.";
    }
    if (selectedTeamIds.value.length < MIN_COMPETITION_TEAMS) {
        return `Seleccioná al menos ${MIN_COMPETITION_TEAMS} equipos.`;
    }
    return null;
}

async function addCompetition(ev: SubmitEvent) {
    ev.preventDefault();
    message.value = "";

    const validation = validate();
    if (validation) {
        message.value = validation;
        return;
    }

    saving.value = true;
    let competition: CompetitionDetailResponse;

    try {
        competition = await $api<CompetitionDetailResponse>("/competitions", {
            method: "POST",
            body: {
                name: value.name,
                sport_id: value.sport_id,
                gender: value.gender,
                starts_at: value.starts_at,
                ends_at: value.ends_at,
                referee_ids: [...value.referee_ids],
                teams: selectedTeamIds.value.map((team_id) => ({
                    team_id,
                    player_ids: [...selectedTeams.value[team_id]],
                })),
            },
        });
    } catch (error) {
        reportError(error);
        saving.value = false;
        return;
    }

    await navigateTo(`/competitions/${competition.id}`);
}

// La selección de equipos deja de ser válida si cambian el deporte o el género.
watch(
    () => [value.sport_id, value.gender],
    () => {
        selectedTeams.value = {};
    },
);
</script>

<template>
    <div class="container p-4">
        <div class="alert theme-danger" role="alert" v-if="message">
            {{ message }}
        </div>

        <h1 class="h4 mb-3">Agregar competencia</h1>

        <form class="vstack gap-3" action="#" @submit="addCompetition">
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

            <div class="row g-3">
                <div class="md:col-6">
                    <div class="form-field">
                        <label for="starts_at" class="form-label">
                            Inicio
                        </label>
                        <DatePicker v-model="value.starts_at" id="starts_at" />
                    </div>
                </div>
                <div class="md:col-6">
                    <div class="form-field">
                        <label for="ends_at" class="form-label">Fin</label>
                        <DatePicker v-model="value.ends_at" id="ends_at" />
                    </div>
                </div>
            </div>

            <hr />

            <div class="form-group">
                <span class="form-label">Árbitros</span>
                <div v-if="!refereesData?.referees.length" class="form-text">
                    No hay árbitros disponibles.
                </div>
                <div v-else class="d-flex flex-wrap gap-2">
                    <div
                        class="form-field"
                        v-for="referee in refereesData.referees"
                        :key="referee.id"
                    >
                        <input
                            class="check"
                            type="checkbox"
                            :id="`referee-${referee.id}`"
                            :checked="value.referee_ids.includes(referee.id)"
                            @change="toggleReferee(referee.id)"
                        />
                        <label :for="`referee-${referee.id}`">
                            {{ referee.name }}
                        </label>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <span class="form-label">
                    Equipos participantes (entre
                    {{ MIN_COMPETITION_TEAMS }} y {{ MAX_COMPETITION_TEAMS }})
                </span>
                <TeamPicker
                    v-model="selectedTeams"
                    :teams="teamsData?.teams ?? []"
                    :max="MAX_COMPETITION_TEAMS"
                    :disabled="!canPickTeams"
                    @error="reportError"
                />
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
