<script setup lang="ts">
import {
    type PlayerResponse as Player,
    type TeamListResponse,
} from "~/utils/openapi";

import { IconArrowLeft } from "~/assets/icons";

const MAX_PLAYER_TEAMS = 3;

const { $api } = useNuxtApp();

const route = useRoute();
const sportId = computed(() => Number(route.params.sport));

const value = reactive<{
    name: string;
    gender: Player["gender"] | "";
    team_ids: number[];
}>({
    name: "",
    gender: "",
    team_ids: [],
});

const canPickCreateTeams = computed(() => Boolean(value.gender));

const { data: createTeamsData } = await useAPI<TeamListResponse>("/teams", {
    query: computed(() => ({
        status: "enabled",
        sort: "name_asc",
        sport_id: sportId.value,
        gender_category: value.gender,
    })),
    enabled: canPickCreateTeams,
});

function toggleTeam(team_ids: number[], id: number) {
    const index = team_ids.indexOf(id);

    if (index === -1) {
        if (team_ids.length >= MAX_PLAYER_TEAMS) return;
        team_ids.push(id);
    } else {
        team_ids.splice(index, 1);
    }
}

// team_id -> player_ids de los jugadores seleccionados.
const selectedTeams = ref<Record<number, number[]>>({});

const message = ref("");
const saving = ref(false);

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

function validate(): string | null {
    // if (!value.sport_id || !value.gender) {
    //     return "Seleccioná un deporte y un género.";
    // }
    // if (selectedTeamIds.value.length < MIN_COMPETITION_TEAMS) {
    //     return `Seleccioná al menos ${MIN_COMPETITION_TEAMS} equipos.`;
    // }
    return null;
}

// La selección de equipos deja de ser válida si cambia el género.
watch(
    () => value.gender,
    () => {
        selectedTeams.value = {};
        value.team_ids = [];
    },
);

async function addPlayer(ev: SubmitEvent) {
    ev.preventDefault();
    message.value = "";

    const validation = validate();
    if (validation) {
        message.value = validation;
        return;
    }
    saving.value = true;
    let player: Player;

    try {
        player = await $api<Player>("/players", {
            method: "POST",
            body: {
                name: value.name,
                sport_id: sportId.value,
                gender: value.gender,
                team_ids: [...value.team_ids],
            },
        });
    } catch (error) {
        reportError(error);
        saving.value = false;
        return;
    }

    await navigateTo(`/home/${sportId.value}/players/${player.id}`);
}
</script>

<template>
    <div>
        <div class="alert theme-danger" role="alert" v-if="message">
            {{ message }}
        </div>

        <NuxtLink
            class="d-flex align-items-center gap-1 text-decoration-none mb-3"
            :to="{
                name: 'home-sport-players',
                params: { sport: route.params.sport },
            }"
        >
            <IconArrowLeft />
            <span>Volver al listado</span>
        </NuxtLink>
        <h1 class="h2 fw-light m-0">Nuevo jugador</h1>
        <hr />
        <form class="vstack gap-3 mt-3" action="#" @submit="addPlayer">
            <div class="form-field">
                <label for="name" class="form-label">Nombre</label>
                <input
                    class="form-control"
                    id="name"
                    v-model="value.name"
                    type="text"
                    required
                />
            </div>
            <div class="form-field">
                <label for="gender" class="form-label">Género</label>
                <select
                    class="form-control"
                    id="gender"
                    v-model="value.gender"
                    required
                >
                    <option value="">Elegir género</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                </select>
            </div>
            <div class="form-group">
                <span class="form-label">
                    Selección de equipos (máx. {{ MAX_PLAYER_TEAMS }})
                </span>
                <p v-if="!canPickCreateTeams" class="form-text mb-0">
                    Primero, seleccioná un género.
                </p>
                <p
                    v-else-if="!createTeamsData?.teams.length"
                    class="form-text mb-0"
                >
                    No hay equipos en esa categoría.
                </p>
                <ul v-else class="list-group">
                    <li
                        class="list-group-item"
                        v-for="team in createTeamsData?.teams"
                        :key="team.id"
                    >
                        <div class="form-field">
                            <input
                                class="check"
                                type="checkbox"
                                :id="`team-${team.id}`"
                                :checked="value.team_ids.includes(team.id)"
                                :disabled="
                                    !value.team_ids.includes(team.id) &&
                                    value.team_ids.length >= MAX_PLAYER_TEAMS
                                "
                                @change="toggleTeam(value.team_ids, team.id)"
                            />
                            <label
                                class="stretched-link"
                                :for="`team-${team.id}`"
                            >
                                {{ team.name }}
                            </label>
                        </div>
                    </li>
                </ul>
            </div>

            <div class="d-flex align-items-center gap-2">
                <NuxtLink
                    class="btn-outline theme-secondary"
                    :to="`/home/${sportId}/players`"
                >
                    Cancelar
                </NuxtLink>
                <button
                    class="btn-solid theme-primary ms-auto"
                    :disabled="saving"
                >
                    Confirmar
                </button>
            </div>
        </form>
    </div>
</template>
