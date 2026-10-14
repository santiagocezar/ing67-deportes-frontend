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
                starts_at: new Date(value.starts_at).toISOString(),
                ends_at: new Date(value.ends_at).toISOString(),
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
        <p class="notification is-danger" v-if="message">{{ message }}</p>

        <p class="title is-5">Agregar competencia</p>

        <form action="#" @submit="addCompetition">
            <div class="field">
                <label for="name" class="label">Nombre</label>
                <input
                    class="input"
                    id="name"
                    v-model="value.name"
                    type="text"
                    required
                />
            </div>
            <div class="sideside">
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
            </div>
            <div class="sideside">
                <label class="field">
                    <span class="label">Inicio</span>
                    <input
                        class="input"
                        v-model="value.starts_at"
                        type="datetime-local"
                        required
                    />
                </label>
                <label class="field">
                    <span class="label">Fin</span>
                    <input
                        class="input"
                        v-model="value.ends_at"
                        type="datetime-local"
                        required
                    />
                </label>
            </div>
            <hr />
            <div class="field">
                <span class="label">Árbitros</span>
                <p v-if="!refereesData?.referees.length">
                    No hay árbitros disponibles.
                </p>
                <div class="checkboxes" v-else>
                    <label
                        class="checkbox"
                        v-for="referee in refereesData.referees"
                        :key="referee.id"
                    >
                        <input
                            type="checkbox"
                            :checked="value.referee_ids.includes(referee.id)"
                            @change="toggleReferee(referee.id)"
                        />
                        {{ referee.name }}
                    </label>
                </div>
            </div>

            <div class="field">
                <span class="label">
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
            <div class="is-flex mt-3">
                <a class="button" href="/competitions">Cancelar</a>
                <div class="is-flex-grow-1"></div>
                <button class="button is-primary" :disabled="saving">
                    Agregar competencia
                </button>
            </div>
        </form>
    </div>
</template>

<style>
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

.checkboxes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
}
</style>
