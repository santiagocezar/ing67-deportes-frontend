<script lang="ts" setup>
import {
    type CompetitionDetailResponse,
    type MatchListResponse,
    type MatchResponse,
} from "~/utils/openapi";

import Shuffle from "~icons/fluent/arrow-shuffle-48-filled";

const { $api } = useNuxtApp();

const { editing: competition } = defineProps<{
    editing: CompetitionDetailResponse;
}>();

const { data: matches, refresh: refreshMatches } =
    await useAPI<MatchListResponse>(
        () => `/competitions/${competition.id}/matches`,
    );

const message = ref("");

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
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

const randomizeEnabled = computed(() =>
    matches.value?.matches.every((m) => m.status === "incomplete"),
);

async function randomizeMatches() {
    try {
        await $api(`/competitions/${competition.id}/matches/randomize`, {
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
</script>

<template>
    <section>
        <div class="d-flex align-items-center gap-2 mb-3">
            <h2 class="h5 mb-0">Partidos</h2>
            <button
                class="btn-solid btn-styled theme-primary ms-auto"
                type="button"
                :disabled="!randomizeEnabled"
                @click="randomizeMatches"
            >
                <Shuffle />
                <span>Sorteo</span>
            </button>
        </div>

        <div class="alert theme-danger" role="alert" v-if="message">
            {{ message }}
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
                        <NuxtLink
                            class="match text-decoration-none"
                            :to="{
                                name: 'home-sport-competitions-id-matches-matchId',
                                params: {
                                    id: competition.id,
                                    matchId: match.id,
                                },
                            }"
                        >
                            <p class="fw-semibold mb-1">
                                {{ match.team_1.name }} vs.
                                {{ match.team_2.name }}
                            </p>
                            <div
                                class="d-flex flex-wrap align-items-center gap-2"
                            >
                                <span
                                    class="badge badge-subtle"
                                    :class="matchStatusTheme(match.status)"
                                >
                                    {{ matchStatusLabel(match.status) }}
                                </span>
                                <span class="fg-2 small">
                                    Árbitro: {{ match.referee.name }}
                                </span>
                            </div>
                        </NuxtLink>

                        <hr
                            class="my-1"
                            v-if="index < roundMatches.length - 1"
                        />
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>
