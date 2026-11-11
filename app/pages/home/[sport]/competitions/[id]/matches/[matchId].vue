<script setup lang="ts">
import {
    type AuthMeResponse,
    type MatchManualReviewStatusResponse,
    type MatchResponse,
    type MatchRosterScanManualReviewListResponse,
    type PlayerSanctionCreateRequest,
    type PlayerSanctionListResponse,
    type PlayerSanctionResponse,
    type RosterPlayerResponse,
} from "~/utils/openapi";

import { IconArrowLeft, IconSave, IconScanPerson } from "~/assets/icons";
import ScanCard from "~/components/ScanCard.vue";
import SanctionForm from "~/components/SanctionForm.vue";

const route = useRoute();
const { $api } = useNuxtApp();

const {
    public: { apiBase },
} = useRuntimeConfig();

const {
    data: match,
    pending,
    error,
    refresh,
} = await useAPI<MatchResponse>(() => `/matches/${route.params.matchId}`);

const { data: me } = await useAPI<AuthMeResponse>("/auth/me", {
    onResponseError: () => {}, // evitar redirigir
});

const { data: manualReviewStatus, refresh: refreshManualReviewStatus } =
    await useAPI<MatchManualReviewStatusResponse>(
        () => `/matches/${route.params.matchId}/manual-review-status`,
    );

const { data: pendingReviews, refresh: refreshPendingReviews } =
    await useAPI<MatchRosterScanManualReviewListResponse>("/manual-reviews", {
        query: computed(() => ({
            match_id: Number(route.params.matchId),
            status: "pending",
        })),
    });

async function refreshReviewState() {
    await Promise.all([refreshManualReviewStatus(), refreshPendingReviews()]);
}

const pendingReviewCount = computed(
    () =>
        manualReviewStatus.value?.pending_review_count ??
        pendingReviews.value?.manual_reviews.length ??
        0,
);

const edited = reactive({
    starts_at: "",
    ends_at: "",
});

const message = ref("");

const scanTarget = ref<MatchResponse["team_1"] | null>(null);

const scanTeams = computed(() =>
    match.value ? [match.value.team_1, match.value.team_2] : [],
);

// El administrador puede sancionar desde cualquier partido en curso. El árbitro
// solo desde un partido en curso al que esté asignado.
const canCreateSanction = computed(() => {
    const currentMatch = match.value;
    const user = me.value?.user;
    if (!currentMatch || !user) return false;
    if (currentMatch.status !== "in_progress") return false;

    return (
        user.role === "administrator" ||
        (user.role === "referee" && user.id === currentMatch.referee.id)
    );
});

const sanctionTarget = ref<RosterPlayerResponse | null>(null);
const sanctionFormKey = ref(0);
const sanctionSaving = ref(false);
const sanctionMessage = ref("");
const sanctionError = ref("");
const targetSanctions = ref<PlayerSanctionResponse[]>([]);
const targetSanctionsLoading = ref(false);

const { forget: forgetActiveSanction } = useActiveSanctions();

let sanctionRequestId = 0;

function sanctionErrorMessage(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    return body?.error?.message ?? "Ocurrió un error inesperado.";
}

async function loadTargetSanctions(playerId: number) {
    targetSanctionsLoading.value = true;
    const requestId = ++sanctionRequestId;

    try {
        const response = await $api<PlayerSanctionListResponse>(
            `/players/${playerId}/sanctions`,
            { query: { status: "active", page: 1 } },
        );
        if (requestId !== sanctionRequestId) return;
        targetSanctions.value = response.sanctions;
    } catch {
        if (requestId !== sanctionRequestId) return;
        targetSanctions.value = [];
    } finally {
        if (requestId === sanctionRequestId) {
            targetSanctionsLoading.value = false;
        }
    }
}

function openSanctionDialog(player: RosterPlayerResponse) {
    sanctionTarget.value = player;
    sanctionFormKey.value += 1;
    sanctionMessage.value = "";
    sanctionError.value = "";
    targetSanctions.value = [];
    loadTargetSanctions(player.id);
}

async function createSanction(body: PlayerSanctionCreateRequest) {
    if (!match.value || !sanctionTarget.value) return;

    const player = sanctionTarget.value;
    sanctionSaving.value = true;
    sanctionError.value = "";
    sanctionMessage.value = "";

    try {
        await $api(
            `/matches/${match.value.id}/players/${player.id}/sanctions`,
            {
                method: "POST",
                body,
            },
        );
    } catch (error) {
        sanctionError.value = sanctionErrorMessage(error);
        sanctionSaving.value = false;
        return;
    }

    sanctionSaving.value = false;
    sanctionMessage.value = `Sanción registrada para ${player.name}.`;
    sanctionFormKey.value += 1;
    forgetActiveSanction(player.id);
    await loadTargetSanctions(player.id);
}

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

function toInputValue(date: string | null) {
    if (!date) return "";
    const d = new Date(date);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate(),
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

watch(
    match,
    (value) => {
        if (!value) return;
        edited.starts_at = toInputValue(value.starts_at);
        edited.ends_at = toInputValue(value.ends_at);
    },
    { immediate: true },
);

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

function openTeamScan(team: MatchResponse["team_1"]) {
    scanTarget.value = team;
}

async function saveMatch(ev: SubmitEvent) {
    ev.preventDefault();
    if (!match.value) return;

    message.value = "";

    if (!edited.starts_at || !edited.ends_at) {
        message.value = "Completá el inicio y el fin del partido.";
        return;
    }

    try {
        await $api(`/matches/${match.value.id}`, {
            method: "PUT",
            body: {
                starts_at: toISOString(edited.starts_at),
                ends_at: toISOString(edited.ends_at),
            },
        });
    } catch (error) {
        reportError(error);
        return;
    }

    await refresh();
}
</script>

<template>
    <div>
        <NuxtLink
            class="d-flex align-items-center gap-1 text-decoration-none mb-3"
            :to="{
                name: 'home-sport-competitions-id',
                params: {
                    sport: route.params.sport,
                    id: route.params.id,
                },
            }"
        >
            <IconArrowLeft />
            <span>
                Volver a
                {{ match?.competition.name ?? "la competencia" }}
            </span>
        </NuxtLink>

        <p v-if="pending">Cargando partido...</p>

        <div v-else-if="error" class="alert theme-danger" role="alert">
            No se pudo cargar el partido.
        </div>

        <template v-else-if="match">
            <div class="d-flex flex-wrap align-items-start gap-2 mb-2">
                <div class="flex-grow-1">
                    <h1 class="h2 fw-light mb-1">
                        {{ match.team_1.name }} vs.
                        {{ match.team_2.name }}
                    </h1>
                    <p class="fg-2 mb-0">
                        Fecha {{ match.round_number }} · Árbitro:
                        {{ match.referee.name }}
                    </p>
                </div>
                <span
                    class="badge badge-subtle"
                    :class="matchStatusTheme(match.status)"
                >
                    {{ matchStatusLabel(match.status) }}
                </span>
            </div>
            <hr />

            <form class="mt-4 row g-2" action="#" @submit="saveMatch">
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
                            v-model="edited.starts_at"
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
                            v-model="edited.ends_at"
                            type="datetime-local"
                        />
                    </div>
                </div>
                <div class="alert theme-danger" role="alert" v-if="message">
                    {{ message }}
                </div>
                <div class="d-flex justify-content-end">
                    <button class="btn-solid theme-primary" type="submit">
                        <IconSave />
                        <span>Guardar horario</span>
                    </button>
                </div>
            </form>

            <div class="mt-4 row g-4">
                <div v-for="team in scanTeams" class="col-12 md:col-6">
                    <section class="card">
                        <div
                            class="card-header hstack align-items-center gap-2"
                        >
                            <div class="flex-grow-1">
                                Plantel de {{ team.name }}
                            </div>
                            <span class="d-block fg-2 small">
                                {{ team.roster.length }}
                                {{
                                    team.roster.length === 1
                                        ? "jugador"
                                        : "jugadores"
                                }}
                            </span>
                        </div>

                        <div class="card-body p-4">
                            <ul class="list-group list-group-flush">
                                <li
                                    v-for="player in team.roster"
                                    class="relative hstack px-0 list-group-item align-items-center"
                                >
                                    <img
                                        v-if="player.primary_photo_path"
                                        class="avatar me-4 avatar-sm"
                                        style="border: none"
                                        :src="
                                            apiBase + player.primary_photo_path
                                        "
                                    />
                                    <div v-else class="avatar me-4">
                                        {{ avatarLetters(player.name) }}
                                    </div>

                                    <NuxtLink
                                        :to="{
                                            name: 'home-sport-players-id',
                                            params: {
                                                sport: route.params.sport,
                                                id: player.id,
                                            },
                                        }"
                                    >
                                        {{ player.name }}
                                    </NuxtLink>

                                    <button
                                        v-if="canCreateSanction"
                                        class="btn-outline theme-danger btn-sm ms-auto"
                                        type="button"
                                        data-bs-toggle="dialog"
                                        data-bs-target="#sanction-create-dialog"
                                        @click="openSanctionDialog(player)"
                                    >
                                        Sancionar
                                    </button>
                                </li>
                            </ul>
                            <button
                                class="ms-auto btn-outline theme-primary"
                                type="button"
                                data-bs-toggle="dialog"
                                data-bs-target="#roster-scan-dialog"
                                @click="openTeamScan(team)"
                            >
                                <IconScanPerson />

                                <span>Escanear</span>
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            <section v-if="pendingReviews?.manual_reviews.length" class="mt-4">
                <div class="d-flex flex-wrap align-items-start gap-2 mb-3">
                    <div class="flex-grow-1">
                        <h2 class="h5 mb-1">Requiere auditoría biométrica</h2>
                        <p class="fg-2 small mb-0">
                            {{ pendingReviewCount }}
                            {{
                                pendingReviewCount === 1
                                    ? "revisión pendiente"
                                    : "revisiones pendientes"
                            }}
                        </p>
                    </div>
                    <NuxtLink
                        class="btn-outline btn-sm theme-secondary"
                        :to="{ name: 'scans' }"
                    >
                        Ver todas
                    </NuxtLink>
                </div>
                <div class="vstack gap-2">
                    <ScanCard
                        v-for="review in pendingReviews.manual_reviews"
                        :key="review.scan.id"
                        :review
                    />
                </div>
            </section>

            <dialog
                id="roster-scan-dialog"
                class="dialog dialog-scrollable"
                @close="scanTarget = null"
            >
                <div class="dialog-header">
                    <h2 class="dialog-title">
                        Escaneando
                        {{ scanTarget?.name ?? "equipo" }}
                    </h2>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="dialog"
                        aria-label="Cerrar"
                    ></button>
                </div>
                <div class="dialog-body">
                    <RosterScan
                        v-if="scanTarget"
                        :match-id="match.id"
                        :team-id="scanTarget.id"
                        :team-name="scanTarget.name"
                        @scanned="refreshReviewState"
                    />
                </div>
            </dialog>

            <dialog
                id="sanction-create-dialog"
                class="dialog dialog-scrollable"
                @close="sanctionTarget = null"
            >
                <div class="dialog-header">
                    <h2 class="dialog-title">Registrar sanción</h2>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="dialog"
                        aria-label="Cerrar"
                    ></button>
                </div>
                <div class="dialog-body vstack gap-3">
                    <p class="fg-2 small mb-0">
                        Partido {{ match.team_1.name }} vs.
                        {{ match.team_2.name }} · {{ match.competition.name }}
                    </p>

                    <div
                        v-if="targetSanctionsLoading"
                        class="d-flex align-items-center gap-2 fg-2 small"
                    >
                        <span
                            class="spinner-border spinner-border-sm"
                            aria-hidden="true"
                        ></span>
                        Buscando sanciones activas…
                    </div>
                    <div
                        v-else-if="targetSanctions.length"
                        class="alert theme-warning"
                        role="status"
                    >
                        <strong>{{ sanctionTarget?.name }}</strong> ya tiene
                        {{ targetSanctions.length }}
                        {{
                            targetSanctions.length === 1
                                ? "sanción activa"
                                : "sanciones activas"
                        }}. Las sanciones se cumplen una detrás de otra.
                    </div>

                    <div
                        v-if="sanctionMessage"
                        class="alert theme-success"
                        role="status"
                    >
                        {{ sanctionMessage }}
                    </div>
                    <div
                        v-if="sanctionError"
                        class="alert theme-danger"
                        role="alert"
                    >
                        {{ sanctionError }}
                    </div>

                    <SanctionForm
                        v-if="sanctionTarget"
                        :key="sanctionFormKey"
                        :player-name="sanctionTarget.name"
                        :saving="sanctionSaving"
                        submit-label="Guardar sanción"
                        @submit="createSanction"
                    />
                </div>
            </dialog>
        </template>
    </div>
</template>

<style scoped>
#roster-scan-dialog {
    --bs-dialog-width: 42rem;
}

#sanction-create-dialog {
    --bs-dialog-width: 36rem;
}
</style>
