<script lang="ts" setup>
import type {
    CompetitionDetailResponse,
    RefereeListResponse,
    RosterImportCompetition,
    RosterImportTeam,
    RosterPlayerResponse,
    TeamListResponse,
} from "~/utils/openapi";

import { IconArrowClockwise } from "~/assets/icons";

const MIN_COMPETITION_TEAMS = 4;
const MAX_COMPETITION_TEAMS = 16;

type ImportTeamStatus = "added" | "replaced" | "unchanged";

const emit = defineEmits<{ refresh: [] }>();

const { $api } = useNuxtApp();

const { editing, readonly } = defineProps<{
    editing: CompetitionDetailResponse;
    readonly?: boolean;
}>();

const message = ref("");

const importFeedback = ref<{
    sourceName: string;
    teams: Array<{
        name: string;
        playerCount: number;
        status: ImportTeamStatus;
    }>;
} | null>(null);

const importedRosters = ref<Record<number, RosterImportTeam>>({});

const rosterImportDialog = useTemplateRef<{ prepare: () => void }>(
    "rosterImportDialog",
);

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

const { data: refereesData } = await useAPI<RefereeListResponse>("/referees", {
    enabled: computed(() => !readonly),
});
const { data: participantTeamsData } = await useAPI<TeamListResponse>(
    "/teams",
    {
        query: computed(() => ({
            status: "enabled",
            sort: "name_asc",
            sport_id: editing?.sport.id,
            gender_category: editing?.gender,
        })),
        enabled: computed(() => !readonly),
    },
);

const participantRoster = computed<Record<number, RosterPlayerResponse[]>>(
    () => {
        const roster: Record<number, RosterPlayerResponse[]> = {};
        for (const team of editing?.teams ?? []) {
            roster[team.id] = team.roster;
        }
        return roster;
    },
);

const participantRefereeIds = reactive<number[]>([]);

const selectedTeams = ref<Record<number, number[]>>({});

const selectedTeamIds = computed(() =>
    Object.keys(selectedTeams.value).map(Number),
);

const teamNames = computed(() =>
    Object.fromEntries(
        (editing?.teams ?? []).map((team) => [team.id, team.name]),
    ),
);

const playerNames = computed(() => {
    const names = new Map<number, string>();

    for (const team of editing?.teams ?? []) {
        for (const player of team.roster) names.set(player.id, player.name);
    }

    for (const team of Object.values(importedRosters.value)) {
        for (const player of team.players) {
            names.set(player.player_id, player.name);
        }
    }

    return names;
});

const draftPlayerConflicts = computed(() => {
    const appearances = new Map<number, number[]>();

    for (const [teamId, playerIds] of Object.entries(selectedTeams.value)) {
        for (const playerId of playerIds) {
            const ids = appearances.get(playerId) ?? [];
            ids.push(Number(teamId));
            appearances.set(playerId, ids);
        }
    }

    return [...appearances.entries()]
        .filter(([, teamIds]) => teamIds.length > 1)
        .map(([playerId, teamIds]) => ({
            name: playerNames.value.get(playerId) ?? `Jugador #${playerId}`,
            teams: teamIds.map(
                (teamId) => teamNames.value[teamId] ?? `Equipo #${teamId}`,
            ),
        }));
});

function importStatusLabel(status: ImportTeamStatus) {
    return {
        added: "agregado",
        replaced: "reemplazado",
        unchanged: "sin cambios",
    }[status];
}

function importStatusTheme(status: ImportTeamStatus) {
    return {
        added: "theme-primary",
        replaced: "theme-info",
        unchanged: "theme-secondary",
    }[status];
}

function toggleReferee(id: number) {
    const index = participantRefereeIds.indexOf(id);
    if (index === -1) participantRefereeIds.push(id);
    else participantRefereeIds.splice(index, 1);
}

function applyImportedRosters(payload: {
    source: RosterImportCompetition;
    teams: RosterImportTeam[];
}) {
    const next = { ...selectedTeams.value };
    const nextImported = { ...importedRosters.value };

    const teams = payload.teams.map((team) => {
        const previous = next[team.team_id] ?? [];
        const playerIds = team.players.map((player) => player.player_id);

        let status: ImportTeamStatus = "added";
        if (previous.length) {
            status =
                previous.length === playerIds.length &&
                playerIds.every((playerId) => previous.includes(playerId))
                    ? "unchanged"
                    : "replaced";
        }

        // Se reemplaza la selección del equipo: no se anexan jugadores ni se
        // crea una segunda inscripción para el mismo equipo.
        next[team.team_id] = playerIds;
        nextImported[team.team_id] = team;

        return { name: team.name, playerCount: playerIds.length, status };
    });

    selectedTeams.value = next;
    importedRosters.value = nextImported;
    importFeedback.value = { sourceName: payload.source.name, teams };
    message.value = "";
}

async function saveParticipants(ev: SubmitEvent) {
    ev.preventDefault();
    if (!editing || readonly) return;
    message.value = "";

    if (selectedTeamIds.value.length < MIN_COMPETITION_TEAMS) {
        message.value = `Seleccioná al menos ${MIN_COMPETITION_TEAMS} equipos.`;
        return;
    }

    if (selectedTeamIds.value.length > MAX_COMPETITION_TEAMS) {
        message.value = `Seleccioná como máximo ${MAX_COMPETITION_TEAMS} equipos.`;
        return;
    }

    if (selectedTeamIds.value.length % 2 !== 0) {
        message.value = "La cantidad de equipos debe ser par.";
        return;
    }

    if (participantRefereeIds.length !== selectedTeamIds.value.length / 2) {
        message.value = "Seleccioná exactamente un árbitro cada dos equipos.";
        return;
    }

    if (draftPlayerConflicts.value.length) {
        message.value =
            "Hay jugadores seleccionados en más de un equipo. Corregí la selección antes de guardar.";
        return;
    }

    try {
        await $api(`/competitions/${editing.id}/participants`, {
            method: "PUT",
            body: {
                referee_ids: [...participantRefereeIds],
                teams: selectedTeamIds.value.map((team_id) => ({
                    team_id,
                    player_ids: [...(selectedTeams.value[team_id] ?? [])],
                })),
            },
        });
    } catch (error) {
        reportError(error);
        return;
    }

    importFeedback.value = null;
    importedRosters.value = {};
    emit("refresh");
}

watch(
    () => editing,
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
</script>

<template>
    <div>
        <form
            v-if="!readonly"
            class="vstack gap-3"
            action="#"
            @submit="saveParticipants"
        >
            <div class="form-group">
                <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                    <span class="form-label mb-0">
                        Equipos participantes (entre
                        {{ MIN_COMPETITION_TEAMS }} y
                        {{ MAX_COMPETITION_TEAMS }})
                    </span>
                    <button
                        type="button"
                        class="btn-outline btn-sm theme-primary ms-auto"
                        data-bs-toggle="dialog"
                        data-bs-target="#roster-import-dialog"
                        :disabled="!editing.is_enabled"
                        @click="rosterImportDialog?.prepare()"
                    >
                        <IconArrowClockwise />
                        <span>Importar equipos de temporada anterior</span>
                    </button>
                </div>
                <TeamPicker
                    v-model="selectedTeams"
                    :teams="participantTeamsData?.teams ?? []"
                    :max="MAX_COMPETITION_TEAMS"
                    :roster="participantRoster"
                    @error="reportError"
                />
            </div>

            <div
                v-if="importFeedback"
                class="alert theme-success"
                role="status"
            >
                <p class="mb-1">
                    Se prepararon {{ importFeedback.teams.length }}
                    {{
                        importFeedback.teams.length === 1
                            ? "plantel"
                            : "planteles"
                    }}
                    desde <strong>{{ importFeedback.sourceName }}</strong
                    >. Los equipos ya inscriptos se actualizaron sin duplicarse.
                </p>
                <ul class="mb-1 small">
                    <li
                        v-for="(team, index) in importFeedback.teams"
                        :key="index"
                    >
                        {{ team.name }} · {{ team.playerCount }}
                        {{ team.playerCount === 1 ? "jugador" : "jugadores" }}
                        <span
                            class="badge badge-subtle ms-1"
                            :class="importStatusTheme(team.status)"
                        >
                            {{ importStatusLabel(team.status) }}
                        </span>
                    </li>
                </ul>
                <p class="mb-0 small">
                    Revisá la selección y guardá los participantes para aplicar
                    la importación.
                </p>
            </div>

            <div
                v-if="draftPlayerConflicts.length"
                class="alert theme-warning"
                role="alert"
            >
                <p class="mb-1">
                    Hay jugadores seleccionados en más de un equipo:
                </p>
                <ul class="mb-0 small">
                    <li
                        v-for="conflict in draftPlayerConflicts"
                        :key="conflict.name"
                    >
                        {{ conflict.name }} ({{ conflict.teams.join(", ") }})
                    </li>
                </ul>
            </div>

            <div class="form-group">
                <span class="form-label">Árbitros</span>
                <p v-if="!refereesData?.referees.length" class="form-text mb-0">
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
                                participantRefereeIds.includes(referee.id)
                            "
                            @change="toggleReferee(referee.id)"
                        />
                        <label :for="`referee-${referee.id}`">
                            {{ referee.name }}
                        </label>
                    </div>
                </div>
            </div>
            <div class="alert theme-danger" role="alert" v-if="message">
                {{ message }}
            </div>
            <div class="d-flex">
                <button class="btn-solid theme-primary ms-auto">
                    Actualizar participantes
                </button>
            </div>
        </form>

        <!-- Vista de solo lectura: los participantes ya inscriptos -->
        <div v-else class="vstack gap-3">
            <div class="form-group">
                <span class="form-label">Equipos participantes</span>
                <div v-if="!editing.teams.length" class="form-text mb-0">
                    No hay equipos inscriptos.
                </div>
                <ul v-else class="list-group">
                    <li
                        v-for="team in editing.teams"
                        :key="team.id"
                        class="list-group-item"
                    >
                        <div class="d-flex align-items-center gap-2">
                            <span class="flex-grow-1">{{ team.name }}</span>
                            <span class="badge badge-subtle theme-secondary">
                                {{ team.roster.length }}
                                {{
                                    team.roster.length === 1
                                        ? "jugador"
                                        : "jugadores"
                                }}
                            </span>
                        </div>
                        <p
                            v-if="team.roster.length"
                            class="fg-2 small mb-0 mt-1"
                        >
                            {{ team.roster.map((p) => p.name).join(", ") }}
                        </p>
                    </li>
                </ul>
            </div>

            <div class="form-group">
                <span class="form-label">Árbitros</span>
                <div v-if="!editing.referees.length" class="form-text mb-0">
                    No hay árbitros asignados.
                </div>
                <ul v-else class="list-group">
                    <li
                        v-for="referee in editing.referees"
                        :key="referee.id"
                        class="list-group-item"
                    >
                        {{ referee.name }}
                    </li>
                </ul>
            </div>
        </div>

        <RosterImportDialog
            ref="rosterImportDialog"
            :competition="editing"
            @imported="applyImportedRosters"
        />
    </div>
</template>
