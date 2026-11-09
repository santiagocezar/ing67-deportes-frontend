<script setup lang="ts">
import type { TeamEnvelope, TeamUpdateRequest } from "~/utils/openapi";

import ArrowLeft from "~icons/fluent/arrow-left-24-filled";
import Subtract from "~icons/fluent/subtract-circle-48-filled";
import Checkmark from "~icons/fluent/checkmark-circle-48-filled";

const route = useRoute();
const { $api } = useNuxtApp();

const {
    data: response,
    pending,
    error,
    refresh,
} = await useAPI<TeamEnvelope>(() => `/teams/${route.params.id}`);

const team = computed(() => response.value?.team ?? null);

const edited = reactive<TeamUpdateRequest>({
    name: "",
});

const message = ref("");

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

function genderLabel(gender: "male" | "female") {
    return gender === "male" ? "Masculino" : "Femenino";
}

watch(
    team,
    (value) => {
        if (!value) return;
        edited.name = value.name;
    },
    { immediate: true },
);

async function saveTeam(ev: SubmitEvent) {
    ev.preventDefault();
    if (!team.value) return;
    message.value = "";

    try {
        await $api(`/teams/${team.value.id}`, {
            method: "PUT",
            body: {
                name: edited.name,
            } satisfies TeamUpdateRequest,
        });
    } catch (error) {
        reportError(error);
        return;
    }

    refresh();
}

async function setTeamEnabled(enabled: boolean) {
    if (!team.value) return;
    message.value = "";

    try {
        await $api(
            `/teams/${team.value.id}/${enabled ? "enable" : "disable"}`,
            {
                method: "PATCH",
            },
        );
    } catch (error) {
        reportError(error);
        return;
    }

    refresh();
}
</script>

<template>
    <NuxtLink
        class="d-flex align-items-center gap-1 text-decoration-none mb-3"
        :to="{ name: 'home-sport-teams' }"
    >
        <ArrowLeft />
        <span>Volver a Equipos</span>
    </NuxtLink>

    <p v-if="pending">Cargando equipo...</p>

    <div v-else-if="error" class="alert theme-danger" role="alert">
        No se pudo cargar el equipo.
    </div>

    <template v-else-if="team">
        <div class="d-flex flex-wrap align-items-start gap-2 mb-2">
            <div class="flex-grow-1">
                <h1 class="h2 fw-light mb-1">{{ team.name }}</h1>
                <p class="fg-2 mb-0">
                    Plantel
                    {{ genderLabel(team.gender_category) }}
                </p>
            </div>
            <span
                class="badge badge-subtle"
                :class="team.is_enabled ? 'theme-success' : 'theme-danger'"
            >
                {{ team.is_enabled ? "Habilitado" : "Deshabilitado" }}
            </span>
        </div>
        <hr />

        <div class="alert theme-danger" role="alert" v-if="message">
            {{ message }}
        </div>

        <form class="vstack gap-3" action="#" @submit="saveTeam">
            <div class="form-field">
                <label for="name" class="form-label"> Nombre </label>
                <input
                    class="form-control"
                    id="name"
                    v-model="edited.name"
                    type="text"
                    required
                />
            </div>

            <div class="d-flex align-items-center gap-2">
                <button
                    class="btn-outline theme-danger"
                    type="button"
                    v-if="team.is_enabled"
                    @click="setTeamEnabled(false)"
                >
                    <Subtract />
                    <span>Deshabilitar</span>
                </button>

                <button
                    class="btn-outline theme-success"
                    type="button"
                    v-else
                    @click="setTeamEnabled(true)"
                >
                    <Checkmark />
                    <span>Habilitar</span>
                </button>

                <button class="btn-solid theme-primary ms-auto">
                    Actualizar datos
                </button>
            </div>
        </form>
    </template>

    <p v-else>No se encontró el equipo.</p>
</template>
