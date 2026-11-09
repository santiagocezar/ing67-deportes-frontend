<script lang="ts" setup>
import type {
    CompetitionDetailResponse,
    RefereeListResponse,
    RosterPlayerResponse,
    TeamListResponse,
} from "~/utils/openapi";

const MIN_COMPETITION_TEAMS = 4;
const MAX_COMPETITION_TEAMS = 16;

const emit = defineEmits<{ refresh: [] }>();

const { $api } = useNuxtApp();

const { editing } = defineProps<{ editing: CompetitionDetailResponse }>();

const message = ref("");

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

const { data: refereesData } = await useAPI<RefereeListResponse>("/referees");
const { data: participantTeamsData } = await useAPI<TeamListResponse>(
    "/teams",
    {
        query: computed(() => ({
            status: "enabled",
            sort: "name_asc",
            sport_id: editing?.sport.id,
            gender_category: editing?.gender,
        })),
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

function toggleReferee(id: number) {
    const index = participantRefereeIds.indexOf(id);
    if (index === -1) participantRefereeIds.push(id);
    else participantRefereeIds.splice(index, 1);
}

async function saveParticipants(ev: SubmitEvent) {
    ev.preventDefault();
    if (!editing) return;
    message.value = "";

    if (selectedTeamIds.value.length < MIN_COMPETITION_TEAMS) {
        message.value = `Seleccioná al menos ${MIN_COMPETITION_TEAMS} equipos.`;
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
    <form class="vstack gap-3" action="#" @submit="saveParticipants">
        <div class="form-group">
            <span class="form-label">
                Equipos participantes (entre
                {{ MIN_COMPETITION_TEAMS }} y {{ MAX_COMPETITION_TEAMS }})
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
                        :checked="participantRefereeIds.includes(referee.id)"
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
</template>
