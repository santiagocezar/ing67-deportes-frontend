<script setup lang="ts">
import type { TeamEnvelope, TeamUpdateRequest } from "~/utils/openapi";

import Subtract from "~icons/fluent/subtract-circle-48-filled";
import Checkmark from "~icons/fluent/checkmark-circle-48-filled";

const route = useRoute();
const { $api } = useNuxtApp();

const {
    data: response,
    pending,
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
    <div class="container p-4">
        <div class="alert theme-danger" role="alert" v-if="message">
            {{ message }}
        </div>

        <template v-if="team">
            <h1 class="h4 mb-1">Editar equipo #{{ team.id }}</h1>
            <p class="fg-2 mb-3">
                {{ team.sport?.name }} ·
                {{ genderLabel(team.gender_category) }} ·
                {{ team.is_enabled ? "Habilitado" : "Deshabilitado" }}
            </p>

            <form class="vstack gap-3" action="#" @submit="saveTeam">
                <div class="form-field">
                    <label for="name" class="form-label">Nombre</label>
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

                    <a
                        class="btn-outline theme-secondary ms-auto"
                        href="/teams"
                    >
                        Cancelar
                    </a>
                    <button class="btn-solid theme-primary">
                        Guardar cambios
                    </button>
                </div>
            </form>
        </template>
        <p v-else-if="!pending">Hubo un problema para cargar los datos</p>
    </div>
</template>
