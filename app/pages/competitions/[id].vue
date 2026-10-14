<script setup lang="ts">
import {
    type CompetitionDetailResponse,
    type MatchListResponse,
    type MatchResponse,
    type RefereeListResponse,
    type RosterPlayerResponse,
    type TeamListResponse,
} from "~/utils/openapi";

import Subtract from "~icons/fluent/subtract-circle-48-filled";
import Checkmark from "~icons/fluent/checkmark-circle-48-filled";
import Shuffle from "~icons/fluent/arrow-shuffle-48-filled";
import Save from "~icons/fluent/save-24-filled";

type Competition = CompetitionDetailResponse;
type CompetitionStatus = Competition["status"];
type Gender = Competition["gender"];

const MIN_COMPETITION_TEAMS = 4;
const MAX_COMPETITION_TEAMS = 16;

const route = useRoute();
const { $api } = useNuxtApp();

const { data: editing, refresh } = await useAPI<Competition>(
    () => `/competitions/${route.params.id}`,
);

const { data: matches, refresh: refreshMatches } =
    await useAPI<MatchListResponse>(
        () => `/competitions/${route.params.id}/matches`,
    );

const { data: refereesData } = await useAPI<RefereeListResponse>("/referees");

const message = ref("");

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

function genderLabel(gender: Gender) {
    return gender === "male" ? "Masculino" : "Femenino";
}

function statusLabel(status: CompetitionStatus) {
    return {
        scheduled: "Programada",
        in_progress: "En curso",
        finished: "Finalizada",
        discarded: "Descartada",
    }[status];
}

function matchStatusLabel(status: MatchResponse["status"]) {
    return {
        incomplete: "Incompleto",
        scheduled: "Programado",
        in_progress: "En curso",
        finished: "Finalizado",
    }[status];
}

function formatDate(date: string) {
    return new Date(date).toLocaleString();
}

function toInputValue(date: string | null) {
    if (!date) return "";
    const d = new Date(date);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate(),
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toISOString(value: string) {
    return new Date(value).toISOString();
}

const edited = reactive({
    name: "",
    starts_at: "",
    ends_at: "",
});

const participantRefereeIds = reactive<number[]>([]);

watch(
    editing,
    (competition) => {
        if (!competition) return;
        edited.name = competition.name;
        edited.starts_at = toInputValue(competition.starts_at);
        edited.ends_at = toInputValue(competition.ends_at);
    },
    { immediate: true },
);

// --- Edición de datos básicos ---------------------------------------------

async function saveCompetition(ev: SubmitEvent) {
    ev.preventDefault();
    if (!editing.value) return;
    message.value = "";

    try {
        await $api(`/competitions/${editing.value.id}`, {
            method: "PUT",
            body: {
                name: edited.name,
                starts_at: toISOString(edited.starts_at),
                ends_at: toISOString(edited.ends_at),
            },
        });
    } catch (error) {
        reportError(error);
        return;
    }

    refresh();
}

async function setCompetitionEnabled(enabled: boolean) {
    message.value = "";

    try {
        await $api(
            `/competitions/${route.params.id}/${
                enabled ? "enable" : "disable"
            }`,
            { method: "PATCH" },
        );
    } catch (error) {
        reportError(error);
        return;
    }

    refresh();
}

// --- Edición de participantes ---------------------------------------------

const canPickTeams = computed(() => Boolean(editing.value));

const { data: participantTeamsData } = await useAPI<TeamListResponse>(
    "/teams",
    {
        query: computed(() => ({
            status: "enabled",
            sort: "name_asc",
            sport_id: editing.value?.sport.id,
            gender_category: editing.value?.gender,
        })),
        enabled: canPickTeams,
    },
);

const selectedTeams = ref<Record<number, number[]>>({});

const participantRoster = computed<Record<number, RosterPlayerResponse[]>>(
    () => {
        const roster: Record<number, RosterPlayerResponse[]> = {};
        for (const team of editing.value?.teams ?? []) {
            roster[team.id] = team.roster;
        }
        return roster;
    },
);

const selectedTeamIds = computed(() =>
    Object.keys(selectedTeams.value).map(Number),
);

watch(
    editing,
    (competition) => {
        if (!competition) return;

        selectedTeams.value = Object.fromEntries(
            competition.teams.map((team) => [
                team.id,
                team.roster.map((player) => player.id),
            ]),
        );

        participantRefereeIds.length = 0;
        participantRefereeIds.push(...competition.referees.map((r) => r.id));
    },
    { immediate: true },
);

function toggleReferee(id: number) {
    const index = participantRefereeIds.indexOf(id);
    if (index === -1) participantRefereeIds.push(id);
    else participantRefereeIds.splice(index, 1);
}

async function saveParticipants(ev: SubmitEvent) {
    ev.preventDefault();
    if (!editing.value) return;
    message.value = "";

    if (selectedTeamIds.value.length < MIN_COMPETITION_TEAMS) {
        message.value = `Seleccioná al menos ${MIN_COMPETITION_TEAMS} equipos.`;
        return;
    }

    try {
        await $api(`/competitions/${editing.value.id}/participants`, {
            method: "PUT",
            body: {
                referee_ids: [...participantRefereeIds],
                teams: selectedTeamIds.value.map((team_id) => ({
                    team_id,
                    player_ids: [...selectedTeams.value[team_id]],
                })),
            },
        });
    } catch (error) {
        reportError(error);
        return;
    }

    refresh();
}

// --- Partidos --------------------------------------------------------------

const matchEdits = reactive<
    Record<number, { starts_at: string; ends_at: string }>
>({});

watch(
    () => matches.value?.matches,
    (list) => {
        if (!list) return;
        for (const match of list) {
            matchEdits[match.id] = {
                starts_at: toInputValue(match.starts_at),
                ends_at: toInputValue(match.ends_at),
            };
        }
    },
    { immediate: true },
);

async function randomizeMatches() {
    message.value = "";

    try {
        await $api(`/competitions/${route.params.id}/matches/randomize`, {
            method: "POST",
        });
    } catch (error) {
        reportError(error);
        return;
    }

    refreshMatches();
}

const matchesByRound = computed(() => {
    const rounds = new Map<number, MatchResponse[]>();
    for (const match of matches.value?.matches ?? []) {
        const list = rounds.get(match.round_number) ?? [];
        list.push(match);
        rounds.set(match.round_number, list);
    }
    return [...rounds.entries()].sort(([a], [b]) => a - b);
});

async function saveMatch(match: MatchResponse, ev: SubmitEvent) {
    ev.preventDefault();
    message.value = "";

    const edit = matchEdits[match.id];
    if (!edit?.starts_at || !edit?.ends_at) {
        message.value = "Completá el inicio y el fin del partido.";
        return;
    }

    try {
        await $api(`/matches/${match.id}`, {
            method: "PUT",
            body: {
                starts_at: toISOString(edit.starts_at),
                ends_at: toISOString(edit.ends_at),
            },
        });
    } catch (error) {
        reportError(error);
        return;
    }

    refreshMatches();
}
</script>

<template>
    <div class="container p-4">
        <p class="notification is-danger" v-if="message">{{ message }}</p>

        <form v-if="editing" class="mb-3" action="#" @submit="saveCompetition">
            <p class="title is-5 mb-0">
                Detalles de la competencia #{{ editing.id }}
            </p>

            <p class="mb-3">
                {{ editing.sport.name }} {{ genderLabel(editing.gender) }} ·
                {{ statusLabel(editing.status) }}
            </p>

            <label class="field">
                <span class="label">Nombre</span>
                <input
                    class="input"
                    v-model="edited.name"
                    type="text"
                    required
                />
            </label>

            <div class="sideside mt-3">
                <label class="field">
                    <span class="label">Inicio</span>
                    <input
                        class="input"
                        v-model="edited.starts_at"
                        type="datetime-local"
                        required
                    />
                </label>
                <label class="field">
                    <span class="label">Fin</span>
                    <input
                        class="input"
                        v-model="edited.ends_at"
                        type="datetime-local"
                        required
                    />
                </label>
            </div>
            <div class="is-flex mt-3">
                <button
                    class="button"
                    type="button"
                    v-if="editing.is_enabled"
                    @click="setCompetitionEnabled(false)"
                >
                    <span class="icon is-small has-text-danger">
                        <Subtract />
                    </span>
                    <span> Deshabilitar </span>
                </button>

                <button
                    class="button"
                    type="button"
                    v-else
                    @click="setCompetitionEnabled(true)"
                >
                    <span class="icon is-small has-text-success">
                        <Checkmark />
                    </span>
                    <span> Habilitar </span>
                </button>
                <div class="is-flex-grow-1"></div>
                <button class="button is-primary">Actualizar datos</button>
            </div>
        </form>

        <hr />

        <section v-if="editing" class="mb-5">
            <p class="title is-5">Equipos y árbitros</p>
            <form action="#" @submit="saveParticipants">
                <div class="field">
                    <span class="label">
                        Equipos participantes (entre
                        {{ MIN_COMPETITION_TEAMS }} y
                        {{ MAX_COMPETITION_TEAMS }})
                    </span>
                    <TeamPicker
                        v-model="selectedTeams"
                        :teams="participantTeamsData?.teams ?? []"
                        :max="MAX_COMPETITION_TEAMS"
                        :roster="participantRoster"
                        @error="reportError"
                    />
                </div>

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
                                :checked="
                                    participantRefereeIds.includes(referee.id)
                                "
                                @change="toggleReferee(referee.id)"
                            />
                            {{ referee.name }}
                        </label>
                    </div>
                </div>

                <button class="button is-primary">
                    Actualizar participantes
                </button>
            </form>
        </section>
        <hr />

        <section>
            <div class="is-flex is-align-items-center mb-3">
                <p class="title is-5 mb-0">Partidos</p>
                <div class="is-flex-grow-1"></div>
                <button
                    class="button is-primary"
                    type="button"
                    @click="randomizeMatches"
                >
                    <span class="icon">
                        <Shuffle />
                    </span>
                    <span>Sorteo</span>
                </button>
            </div>

            <p v-if="!matches?.matches.length">
                Todavía no hay partidos generados.
            </p>

            <div
                class="box"
                v-for="[round, roundMatches] in matchesByRound"
                :key="round"
            >
                <p class="title is-6 mb-3">Fecha {{ round }}</p>
                <div class="mb-3" v-for="match in roundMatches" :key="match.id">
                    <hr class="my-2" />
                    <div class="is-flex is-align-items-center">
                        <div>
                            <p class="has-text-weight-semibold">
                                {{ match.team_1.name }} vs
                                {{ match.team_2.name }}
                            </p>
                            <p class="is-size-7">
                                <span
                                    class="tag"
                                    :class="{
                                        'is-danger':
                                            match.status === 'incomplete',
                                    }"
                                >
                                    {{ matchStatusLabel(match.status) }}
                                </span>
                                Árbitro: {{ match.referee.name }}
                            </p>
                        </div>
                        <div class="is-flex-grow-1"></div>
                        <button
                            class="button"
                            type="submit"
                            :form="`match-form-${match.id}`"
                            aria-label="Actualizar"
                            title="Actualizar"
                        >
                            <span class="icon">
                                <Save />
                            </span>
                        </button>
                    </div>
                    <form
                        class="mt-2"
                        :id="`match-form-${match.id}`"
                        action="#"
                        @submit="saveMatch(match, $event)"
                    >
                        <div class="field">
                            <span class="label">Inicio y fin</span>
                            <div class="sideside">
                                <input
                                    class="input"
                                    v-model="matchEdits[match.id].starts_at"
                                    type="datetime-local"
                                />
                                <input
                                    class="input"
                                    v-model="matchEdits[match.id].ends_at"
                                    type="datetime-local"
                                />
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </section>
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

@media (max-width: 768px) {
    .sideside {
        grid-template-columns: 1fr;
    }
}

.checkboxes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
}
</style>
