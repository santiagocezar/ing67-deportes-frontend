<script setup lang="ts">
import {
    type PlayerListResponse,
    type RosterPlayerResponse,
} from "~/utils/openapi";

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

const selectedTeamIds = computed(() =>
    Object.keys(selection.value).map(Number),
);
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

function playerInputId(teamId: number, playerId: number) {
    return `team-${teamId}-player-${playerId}`;
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
        <p v-if="disabled" class="form-text mb-0">
            Primero, seleccioná deporte y género.
        </p>
        <p v-else-if="!teams.length" class="form-text mb-0">
            No hay equipos en esa categoría.
        </p>
        <div v-else class="accordion accordion-gap">
            <details
                v-for="team in teams"
                :key="team.id"
                class="accordion-item"
                @toggle="onToggle(team.id, $event)"
            >
                <summary class="accordion-header">
                    <strong v-if="selectedCount(team.id) > 0">
                        {{ team.name }}
                    </strong>
                    <span v-else>{{ team.name }}</span>
                    <span
                        class="badge ms-2"
                        :class="{
                            'theme-primary': selectedCount(team.id) > 0,
                        }"
                    >
                        {{ selectedCount(team.id) }}
                    </span>
                    <svg
                        class="accordion-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="m2 5 6 6 6-6" />
                    </svg>
                </summary>

                <div class="accordion-body">
                    <p v-if="loading[team.id]" class="fg-2">
                        Cargando jugadores...
                    </p>
                    <p v-else-if="!players[team.id]?.length" class="fg-2">
                        No hay jugadores habilitados en este equipo.
                    </p>
                    <div v-else class="d-flex flex-wrap gap-2">
                        <div
                            class="form-field"
                            v-for="player in players[team.id]"
                            :key="player.id"
                        >
                            <input
                                class="check"
                                type="checkbox"
                                :id="playerInputId(team.id, player.id)"
                                :checked="isSelected(team.id, player.id)"
                                :disabled="isPlayerDisabled(team.id)"
                                @change="togglePlayer(team.id, player.id)"
                            />
                            <label :for="playerInputId(team.id, player.id)">
                                {{ player.name }}
                            </label>
                        </div>
                    </div>
                </div>
            </details>
        </div>
    </div>
</template>
