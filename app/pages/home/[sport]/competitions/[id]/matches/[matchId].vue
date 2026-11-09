<script setup lang="ts">
import { type MatchResponse } from "~/utils/openapi";

import ArrowLeft from "~icons/fluent/arrow-left-24-filled";
import Save from "~icons/fluent/save-24-filled";
import ScanPerson from "~icons/fluent/scan-person-24-filled";
import ChevronRight from "~icons/fluent/chevron-right-24-filled";

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

const edited = reactive({
    starts_at: "",
    ends_at: "",
});

const message = ref("");

const scanTarget = ref<MatchResponse["team_1"] | null>(null);

const scanTeams = computed(() =>
    match.value ? [match.value.team_1, match.value.team_2] : [],
);

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
            }"
        >
            <ArrowLeft />
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
                        <Save />
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

                                    {{ player.name }}
                                </li>
                            </ul>
                            <button
                                class="ms-auto btn-outline theme-primary"
                                type="button"
                                data-bs-toggle="dialog"
                                data-bs-target="#roster-scan-dialog"
                                @click="openTeamScan(team)"
                            >
                                <ScanPerson />

                                <span>Escanear</span>
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            <dialog
                id="roster-scan-dialog"
                class="dialog dialog-scrollable"
                @close="scanTarget = null"
            >
                <div class="dialog-header">
                    <h2 class="dialog-title">
                        Escaneo de
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
</style>
