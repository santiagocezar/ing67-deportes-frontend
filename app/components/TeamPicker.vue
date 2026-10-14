<script setup lang="ts">
import {
    type PlayerListResponse,
    type RosterPlayerResponse,
} from "~/utils/openapi";

import Chevron from "~icons/fluent/chevron-down-24-regular";

const props = defineProps<{
    teams: Array<{ id: number; name: string }>;
    max: number;
    disabled?: boolean;
    roster?: Record<number, RosterPlayerResponse[]>;
}>();

const emit = defineEmits<{
    error: [error: unknown];
}>();

const { $api } = useNuxtApp();

const selection = defineModel<Record<number, number[]>>({ required: true });

const players = reactive<Record<number, RosterPlayerResponse[]>>({});
const loading = reactive<Record<number, boolean>>({});

watch(
    () => props.roster,
    (roster) => {
        if (!roster) return;
        for (const [id, list] of Object.entries(roster)) {
            players[Number(id)] = list;
        }
    },
    { immediate: true },
);

const selectedTeamIds = computed(() => Object.keys(selection.value).map(Number));
const atMax = computed(() => selectedTeamIds.value.length >= props.max);

function selectedCount(teamId: number) {
    return selection.value[teamId]?.length ?? 0;
}

function isSelected(teamId: number, playerId: number) {
    return selection.value[teamId]?.includes(playerId) ?? false;
}

function isPlayerDisabled(teamId: number) {
    return !selection.value[teamId] && atMax.value;
}

function togglePlayer(teamId: number, playerId: number) {
    const current = new Set(selection.value[teamId] ?? []);
    if (current.has(playerId)) current.delete(playerId);
    else current.add(playerId);

    const next = { ...selection.value };
    if (current.size) next[teamId] = [...current];
    else delete next[teamId];
    selection.value = next;
}

async function loadPlayers(teamId: number) {
    if (players[teamId] || loading[teamId]) return;

    loading[teamId] = true;
    try {
        const response = await $api<PlayerListResponse>("/players", {
            query: { team_id: teamId, status: "enabled", sort: "name_asc" },
        });
        players[teamId] = response.players;
    } catch (error) {
        emit("error", error);
    } finally {
        loading[teamId] = false;
    }
}

function onToggle(teamId: number, ev: Event) {
    if ((ev.target as HTMLDetailsElement).open) loadPlayers(teamId);
}
</script>

<template>
    <div>
        <p v-if="disabled">Primero, seleccioná deporte y género.</p>
        <p v-else-if="!teams.length">No hay equipos en esa categoría.</p>
        <template v-else>
            <details
                v-for="team in teams"
                :key="team.id"
                class="box mb-2"
                @toggle="onToggle(team.id, $event)"
            >
                <summary class="is-flex is-align-items-center">
                    <span class="icon is-small mr-2">
                        <Chevron />
                    </span>
                    <strong v-if="selectedCount(team.id) > 0">
                        {{ team.name }}
                    </strong>
                    <span v-else>{{ team.name }}</span>
                    <span
                        class="tag ml-auto"
                        :class="{ 'is-primary': selectedCount(team.id) > 0 }"
                    >
                        {{ selectedCount(team.id) }}
                    </span>
                </summary>

                <div class="mt-2">
                    <p v-if="loading[team.id]">Cargando jugadores...</p>
                    <p v-else-if="!players[team.id]?.length">
                        No hay jugadores habilitados en este equipo.
                    </p>
                    <div v-else class="checkboxes">
                        <label
                            class="checkbox"
                            v-for="player in players[team.id]"
                            :key="player.id"
                        >
                            <input
                                type="checkbox"
                                :checked="isSelected(team.id, player.id)"
                                :disabled="isPlayerDisabled(team.id)"
                                @change="togglePlayer(team.id, player.id)"
                            />
                            {{ player.name }}
                        </label>
                    </div>
                </div>
            </details>
        </template>
    </div>
</template>

<style scoped>
summary {
    cursor: pointer;
    user-select: none;
}

summary::-webkit-details-marker {
    display: none;
}

summary .icon {
    transition: transform 0.15s ease;
}

details[open] > summary .icon {
    transform: rotate(180deg);
}
</style>
