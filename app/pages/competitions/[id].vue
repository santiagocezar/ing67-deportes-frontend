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

function statusTheme(status: CompetitionStatus) {
    return {
        scheduled: "theme-secondary",
        in_progress: "theme-info",
        finished: "theme-success",
        discarded: "theme-danger",
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

function matchStatusTheme(status: MatchResponse["status"]) {
    return {
        incomplete: "theme-danger",
        scheduled: "theme-secondary",
        in_progress: "theme-info",
        finished: "theme-success",
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
        <div class="alert theme-danger" role="alert" v-if="message">
            {{ message }}
        </div>

        <template v-if="editing">
            <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                <h1 class="h4 mb-0">
                    Detalles de la competencia #{{ editing.id }}
                </h1>
                <span
                    class="badge badge-subtle"
                    :class="statusTheme(editing.status)"
                >
                    {{ statusLabel(editing.status) }}
                </span>
                <span
                    class="badge badge-subtle"
                    :class="
                        editing.is_enabled ? 'theme-success' : 'theme-danger'
                    "
                >
                    {{ editing.is_enabled ? "Habilitada" : "Deshabilitada" }}
                </span>
            </div>

            <p class="fg-2 mb-3">
                {{ editing.sport.name }} {{ genderLabel(editing.gender) }}
            </p>

            <form class="vstack gap-3" action="#" @submit="saveCompetition">
                <div class="form-field">
                    <label for="name" class="form-label">Nombre</label>
                    <input
                        class="form-control"
                        id="name"
                        v-model="edited.name"
                        type="text"
                        required
                    />
                </div>

                <div class="row g-3">
                    <div class="md:col-6">
                        <div class="form-field">
                            <label for="starts_at" class="form-label">
                                Inicio
                            </label>
                            <DatePicker
                                v-model="edited.starts_at"
                                id="starts_at"
                            />
                        </div>
                    </div>
                    <div class="md:col-6">
                        <div class="form-field">
                            <label for="ends_at" class="form-label">Fin</label>
                            <DatePicker v-model="edited.ends_at" id="ends_at" />
                        </div>
                    </div>
                </div>

                <div class="d-flex flex-wrap align-items-center gap-2">
                    <button
                        class="btn-outline theme-danger"
                        type="button"
                        v-if="editing.is_enabled"
                        @click="setCompetitionEnabled(false)"
                    >
                        <Subtract />
                        <span>Deshabilitar</span>
                    </button>

                    <button
                        class="btn-outline theme-success"
                        type="button"
                        v-else
                        @click="setCompetitionEnabled(true)"
                    >
                        <Checkmark />
                        <span>Habilitar</span>
                    </button>

                    <a
                        class="btn-outline theme-secondary ms-auto"
                        href="/competitions"
                    >
                        Cancelar
                    </a>
                    <button class="btn-solid theme-primary">
                        Guardar cambios
                    </button>
                </div>
            </form>

            <hr />

            <section class="mb-5">
                <h2 class="h5 mb-3">Equipos y árbitros</h2>

                <form
                    class="vstack gap-3"
                    action="#"
                    @submit="saveParticipants"
                >
                    <div class="form-group">
                        <span class="form-label">
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

                    <div class="form-group">
                        <span class="form-label">Árbitros</span>
                        <p
                            v-if="!refereesData?.referees.length"
                            class="form-text mb-0"
                        >
                            No hay árbitros disponibles.
                        </p>
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
                                    :checked="
                                        participantRefereeIds.includes(
                                            referee.id,
                                        )
                                    "
                                    @change="toggleReferee(referee.id)"
                                />
                                <label :for="`referee-${referee.id}`">
                                    {{ referee.name }}
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex">
                        <button class="btn-solid theme-primary ms-auto">
                            Actualizar participantes
                        </button>
                    </div>
                </form>
            </section>
        </template>

        <hr />

        <section>
            <div class="d-flex align-items-center gap-2 mb-3">
                <h2 class="h5 mb-0">Partidos</h2>
                <button
                    class="btn-solid btn-styled theme-primary ms-auto"
                    type="button"
                    @click="randomizeMatches"
                >
                    <Shuffle />
                    <span>Sorteo</span>
                </button>
            </div>

            <p v-if="!matches?.matches.length" class="fg-2">
                Todavía no hay partidos generados.
            </p>

            <div v-else class="vstack gap-3">
                <div
                    class="card"
                    v-for="[round, roundMatches] in matchesByRound"
                    :key="round"
                >
                    <div class="card-header">
                        <h3 class="h6 mb-0">Fecha {{ round }}</h3>
                    </div>

                    <div class="card-body vstack gap-3">
                        <div
                            class="vstack gap-2"
                            v-for="(match, index) in roundMatches"
                            :key="match.id"
                        >
                            <div class="d-flex align-items-start gap-2">
                                <div class="flex-grow-1">
                                    <p class="fw-semibold mb-1">
                                        {{ match.team_1.name }} vs
                                        {{ match.team_2.name }}
                                    </p>
                                    <div
                                        class="d-flex flex-wrap align-items-center gap-2"
                                    >
                                        <span
                                            class="badge badge-subtle"
                                            :class="
                                                matchStatusTheme(match.status)
                                            "
                                        >
                                            {{ matchStatusLabel(match.status) }}
                                        </span>
                                        <span class="fg-2 small">
                                            Árbitro: {{ match.referee.name }}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    class="btn-outline btn-icon theme-primary"
                                    type="submit"
                                    :form="`match-form-${match.id}`"
                                    aria-label="Actualizar"
                                    title="Actualizar"
                                >
                                    <Save />
                                </button>
                            </div>

                            <form
                                class="row g-2"
                                :id="`match-form-${match.id}`"
                                action="#"
                                @submit="saveMatch(match, $event)"
                            >
                                <div class="md:col-6">
                                    <div class="form-field">
                                        <label
                                            class="form-label"
                                            :for="`match-${match.id}-starts-at`"
                                        >
                                            Inicio
                                        </label>
                                        <input
                                            class="form-control"
                                            :id="`match-${match.id}-starts-at`"
                                            v-model="
                                                matchEdits[match.id].starts_at
                                            "
                                            type="datetime-local"
                                        />
                                    </div>
                                </div>
                                <div class="md:col-6">
                                    <div class="form-field">
                                        <label
                                            class="form-label"
                                            :for="`match-${match.id}-ends-at`"
                                        >
                                            Fin
                                        </label>
                                        <input
                                            class="form-control"
                                            :id="`match-${match.id}-ends-at`"
                                            v-model="
                                                matchEdits[match.id].ends_at
                                            "
                                            type="datetime-local"
                                        />
                                    </div>
                                </div>
                            </form>

                            <hr
                                class="my-1"
                                v-if="index < roundMatches.length - 1"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>
