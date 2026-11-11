<script lang="ts" setup>
import type {
    CompetitionDetailResponse,
    CompetitionListResponse,
    CompetitionSummaryResponse,
    RosterImportCompetition,
    RosterImportResponse,
    RosterImportTeam,
} from "~/utils/openapi";

const props = defineProps<{ competition: CompetitionDetailResponse }>();

const emit = defineEmits<{
    imported: [
        payload: {
            source: RosterImportCompetition;
            teams: RosterImportTeam[];
        },
    ];
}>();

const { $api } = useNuxtApp();

const dialog = useTemplateRef<HTMLDialogElement>("dialog");

const origins = ref<CompetitionSummaryResponse[]>([]);
const originsLoading = ref(false);
const originsError = ref("");

const sourceId = ref<number | "">("");

const options = ref<RosterImportResponse | null>(null);
const optionsLoading = ref(false);
const optionsError = ref("");
const selectedTeamIds = ref<number[]>([]);

let optionsRequest = 0;

const selectedTeams = computed(
    () =>
        options.value?.teams.filter((team) =>
            selectedTeamIds.value.includes(team.team_id),
        ) ?? [],
);

const allSelected = computed(
    () =>
        Boolean(options.value?.teams.length) &&
        selectedTeamIds.value.length === options.value?.teams.length,
);

function errorMessage(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    return body?.error?.message ?? "Ocurrió un error inesperado.";
}

async function loadOrigins() {
    originsLoading.value = true;
    originsError.value = "";
    origins.value = [];

    try {
        const competitions: CompetitionSummaryResponse[] = [];
        let page = 1;
        let totalPages = 1;

        do {
            const response = await $api<CompetitionListResponse>(
                "/competitions",
                {
                    query: {
                        lifecycle_status: "finished",
                        sport_id: props.competition.sport.id,
                        gender: props.competition.gender,
                        availability: "all",
                        sort: "starts_at_desc",
                        page,
                    },
                },
            );

            competitions.push(...response.competitions);
            totalPages = response.pagination.total_pages;
            page += 1;
        } while (page <= totalPages && page <= 20);

        origins.value = competitions.filter(
            (competition) =>
                competition.id !== props.competition.id &&
                competition.sport.id === props.competition.sport.id &&
                competition.gender === props.competition.gender,
        );
    } catch (error) {
        originsError.value = errorMessage(error);
    } finally {
        originsLoading.value = false;
    }
}

async function loadOptions(sourceCompetitionId: number) {
    const request = ++optionsRequest;

    optionsLoading.value = true;
    optionsError.value = "";
    options.value = null;
    selectedTeamIds.value = [];

    try {
        const response = await $api<RosterImportResponse>(
            `/competitions/${props.competition.id}/roster-import-options`,
            {
                query: { source_competition_id: sourceCompetitionId },
            },
        );

        if (request !== optionsRequest) return;

        options.value = response;
        selectedTeamIds.value = response.teams.map((team) => team.team_id);
    } catch (error) {
        if (request !== optionsRequest) return;
        optionsError.value = errorMessage(error);
    } finally {
        if (request === optionsRequest) optionsLoading.value = false;
    }
}

watch(sourceId, (id) => {
    if (id === "") {
        optionsRequest += 1;
        options.value = null;
        optionsError.value = "";
        optionsLoading.value = false;
        selectedTeamIds.value = [];
        return;
    }

    loadOptions(Number(id));
});

function reset() {
    sourceId.value = "";
    options.value = null;
    optionsError.value = "";
    optionsLoading.value = false;
    selectedTeamIds.value = [];
}

function prepare() {
    reset();
    loadOrigins();
}

defineExpose({ prepare });

function selectAll() {
    selectedTeamIds.value =
        options.value?.teams.map((team) => team.team_id) ?? [];
}

function clearSelection() {
    selectedTeamIds.value = [];
}

function confirmImport() {
    if (!options.value || !selectedTeams.value.length) return;

    emit("imported", {
        source: options.value.source,
        teams: selectedTeams.value,
    });
    dialog.value?.close();
}
</script>

<template>
    <dialog
        ref="dialog"
        id="roster-import-dialog"
        class="dialog dialog-lg dialog-scrollable"
        @close="reset"
    >
        <div class="dialog-header">
            <h2 class="dialog-title">Importar equipos de temporada anterior</h2>
            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="dialog"
                aria-label="Cerrar"
            ></button>
        </div>

        <div class="dialog-body vstack gap-3">
            <p class="fg-2 small mb-0">
                Elegí una competición finalizada del mismo deporte y género.
                Solo se ofrecen planteles completos de equipos que ya forman
                parte de esta competición y cuyos jugadores siguen habilitados,
                pertenecen al equipo y no tienen sanciones activas.
            </p>

            <div
                v-if="originsLoading"
                class="d-flex align-items-center gap-2 fg-2 small"
                role="status"
            >
                <span
                    class="spinner-border spinner-border-sm"
                    aria-hidden="true"
                ></span>
                Buscando competiciones finalizadas…
            </div>

            <div
                v-else-if="originsError"
                class="alert theme-danger"
                role="alert"
            >
                {{ originsError }}
                <button
                    type="button"
                    class="btn-outline btn-sm theme-danger ms-2"
                    @click="loadOrigins"
                >
                    Reintentar
                </button>
            </div>

            <div
                v-else-if="!origins.length"
                class="alert theme-warning"
                role="status"
            >
                No hay competiciones finalizadas compatibles con este deporte y
                género.
            </div>

            <div v-else class="form-field">
                <label for="roster-import-source" class="form-label">
                    Competición de origen
                </label>
                <select
                    class="form-control"
                    id="roster-import-source"
                    v-model="sourceId"
                >
                    <option value="">Elegir competición</option>
                    <option
                        v-for="origin in origins"
                        :key="origin.id"
                        :value="origin.id"
                    >
                        {{ origin.name }} · finalizada el
                        {{ formatDate(origin.ends_at) }}
                    </option>
                </select>
            </div>

            <div
                v-if="sourceId && optionsLoading"
                class="d-flex align-items-center gap-2 fg-2 small"
                role="status"
            >
                <span
                    class="spinner-border spinner-border-sm"
                    aria-hidden="true"
                ></span>
                Buscando planteles elegibles…
            </div>

            <div
                v-else-if="optionsError"
                class="alert theme-danger"
                role="alert"
            >
                {{ optionsError }}
                <button
                    type="button"
                    class="btn-outline btn-sm theme-danger ms-2"
                    @click="loadOptions(Number(sourceId))"
                >
                    Reintentar
                </button>
            </div>

            <template v-else-if="options">
                <div
                    v-if="!options.teams.length"
                    class="alert theme-warning"
                    role="status"
                >
                    No hay planteles elegibles en esa competición. Un plantel
                    debe seguir completo, con sus jugadores habilitados,
                    vinculados al equipo y sin sanciones activas.
                </div>

                <div v-else class="vstack gap-2">
                    <div class="d-flex flex-wrap align-items-center gap-2">
                        <span class="form-label mb-0">
                            Equipos a importar ({{ selectedTeams.length }} de
                            {{ options.teams.length }})
                        </span>
                        <div class="ms-auto d-flex gap-2">
                            <button
                                type="button"
                                class="btn-outline btn-sm theme-secondary"
                                :disabled="allSelected"
                                @click="selectAll"
                            >
                                Seleccionar todos
                            </button>
                            <button
                                type="button"
                                class="btn-outline btn-sm theme-secondary"
                                :disabled="!selectedTeamIds.length"
                                @click="clearSelection"
                            >
                                Quitar selección
                            </button>
                        </div>
                    </div>

                    <div
                        class="form-field"
                        v-for="team in options.teams"
                        :key="team.team_id"
                    >
                        <input
                            class="check"
                            type="checkbox"
                            :id="`roster-import-team-${team.team_id}`"
                            :value="team.team_id"
                            v-model="selectedTeamIds"
                        />
                        <label :for="`roster-import-team-${team.team_id}`">
                            <strong>{{ team.name }}</strong>
                            <span class="badge badge-subtle theme-primary ms-2">
                                {{ team.players.length }}
                                {{
                                    team.players.length === 1
                                        ? "jugador"
                                        : "jugadores"
                                }}
                            </span>
                            <span class="d-block fg-2 small">
                                {{ team.players.map((p) => p.name).join(", ") }}
                            </span>
                        </label>
                    </div>
                </div>
            </template>

            <div class="alert theme-info" role="note">
                Las sanciones se conservan tal como están registradas: las
                cumplidas siguen cumplidas y las activas continúan vigentes. Por
                eso, los planteles con jugadores sancionados no se ofrecen. Los
                planteles importados reemplazan la selección actual de cada
                equipo, sin duplicar equipos ni jugadores.
            </div>
        </div>

        <div class="dialog-footer">
            <button
                type="button"
                class="btn-outline theme-secondary"
                data-bs-dismiss="dialog"
            >
                Cancelar
            </button>
            <button
                type="button"
                class="btn-solid theme-primary"
                :disabled="!selectedTeams.length"
                @click="confirmImport"
            >
                Importar
                {{ selectedTeams.length }}
                {{ selectedTeams.length === 1 ? "plantel" : "planteles" }}
            </button>
        </div>
    </dialog>
</template>
