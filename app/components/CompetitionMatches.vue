<script lang="ts" setup>
import {
    type CompetitionDetailResponse,
    type MatchListResponse,
    type MatchResponse,
} from "~/utils/openapi";

import { IconEdit, IconShuffle } from "~/assets/icons";

const { $api } = useNuxtApp();

const { editing: competition, readonly } = defineProps<{
    editing: CompetitionDetailResponse;
    readonly?: boolean;
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
    if (readonly) return;

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
                v-if="!readonly"
                class="btn-solid btn-styled theme-primary ms-auto"
                type="button"
                :disabled="!randomizeEnabled"
                @click="randomizeMatches"
            >
                <IconShuffle />
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

                <div class="card-body vstack p-0">
                    <ul class="list-group list-group-flush">
                        <li
                            class="list-group-item bg-transparent p-0"
                            v-for="(match, index) in roundMatches"
                            :key="match.id"
                        >
                            <div
                                class="d-flex flex-column md:flex-row flex-wrap p-4 px-5"
                            >
                                <div class="div">
                                    <p class="fw-semibold mb-1">
                                        {{ match.team_1.name }} vs.
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
                                <div
                                    class="align-self-end align-items-end text-end justify-content-end hstack gap-4"
                                >
                                    <div
                                        class="fg-2 small"
                                        v-if="match.starts_at && match.ends_at"
                                    >
                                        <div>
                                            {{
                                                formatDateTime(match.starts_at)
                                            }}
                                        </div>
                                        <div>
                                            Dura
                                            {{
                                                formatTimeDelta(
                                                    match.starts_at,
                                                    match.ends_at,
                                                )
                                            }}
                                        </div>
                                    </div>
                                    <NuxtLink
                                        class="btn-solid btn-icon"
                                        type="button"
                                        :to="{
                                            name: 'home-sport-competitions-id-matches-matchId',
                                            params: {
                                                sport: competition.sport.id,
                                                id: competition.id,
                                                matchId: match.id,
                                            },
                                        }"
                                    >
                                        <IconEdit />
                                    </NuxtLink>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </section>
</template>
