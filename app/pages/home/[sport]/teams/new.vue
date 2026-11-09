<script setup lang="ts">
import type { TeamCreateRequest, TeamEnvelope } from "~/utils/openapi";

import ArrowLeft from "~icons/fluent/arrow-left-24-filled";

const { $api } = useNuxtApp();

const route = useRoute();
const sportId = computed(() => Number(route.params.sport));

const value = reactive<{
    name: string;
    gender_category: TeamCreateRequest["gender_category"] | "";
}>({
    name: "",
    gender_category: "",
});

const message = ref("");
const saving = ref(false);

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

async function addTeam(ev: SubmitEvent) {
    ev.preventDefault();
    message.value = "";

    saving.value = true;
    let team: TeamEnvelope["team"];

    try {
        const response = await $api<TeamEnvelope>("/teams", {
            method: "POST",
            body: {
                name: value.name,
                gender_category: value.gender_category,
                sport_id: sportId.value,
            } satisfies TeamCreateRequest,
        });
        team = response.team;
    } catch (error) {
        reportError(error);
        saving.value = false;
        return;
    }

    await navigateTo(`/home/${sportId.value}/teams/${team.id}`);
}
</script>

<template>
    <div>
        <div class="alert theme-danger" role="alert" v-if="message">
            {{ message }}
        </div>

        <NuxtLink
            class="d-flex align-items-center gap-1 text-decoration-none mb-3"
            :to="{ name: 'home-sport-teams' }"
        >
            <ArrowLeft />
            <span>Volver al listado</span>
        </NuxtLink>
        <h1 class="h2 fw-light m-0">Nuevo equipo</h1>
        <hr />
        <form class="vstack gap-3 mt-3" action="#" @submit="addTeam">
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
                <label for="gender_category" class="form-label"> Género </label>
                <select
                    class="form-control"
                    id="gender_category"
                    v-model="value.gender_category"
                    required
                >
                    <option value="" disabled>Seleccioná una categoría</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                </select>
            </div>

            <div class="d-flex align-items-center gap-2">
                <a
                    class="btn-outline theme-secondary"
                    :href="`/home/${sportId}/teams`"
                >
                    Cancelar
                </a>
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
