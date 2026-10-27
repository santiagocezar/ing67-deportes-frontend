<script setup lang="ts">
import type {
    SportListResponse,
    TeamCreateRequest,
    TeamEnvelope,
} from "~/utils/openapi";

const { $api } = useNuxtApp();

const value = reactive<{
    name: string;
    gender_category: TeamCreateRequest["gender_category"] | "";
    sport_id: number | "";
}>({
    name: "",
    gender_category: "",
    sport_id: "",
});

const { data: sportsData } = await useAPI<SportListResponse>("/sports");

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
                sport_id: value.sport_id,
            } satisfies TeamCreateRequest,
        });
        team = response.team;
    } catch (error) {
        reportError(error);
        saving.value = false;
        return;
    }

    await navigateTo(`/teams/${team.id}`);
}
</script>

<template>
    <div class="container p-4">
        <div class="alert theme-danger" role="alert" v-if="message">
            {{ message }}
        </div>

        <h1 class="h4 mb-3">Agregar equipo</h1>

        <form class="vstack gap-3" action="#" @submit="addTeam">
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

            <div class="row g-3">
                <div class="md:col-6 form-field">
                    <label for="sport_id" class="form-label">Deporte</label>
                    <select
                        class="form-control"
                        id="sport_id"
                        v-model="value.sport_id"
                        required
                    >
                        <option value="">Elegir deporte</option>
                        <option
                            v-for="sport in sportsData?.sports"
                            :key="sport.id"
                            :value="sport.id"
                        >
                            {{ sport.name }}
                        </option>
                    </select>
                </div>
                <div class="md:col-6 form-field">
                    <label for="gender_category" class="form-label">
                        Categoría de género
                    </label>
                    <select
                        class="form-control"
                        id="gender_category"
                        v-model="value.gender_category"
                        required
                    >
                        <option value="" disabled>
                            Seleccioná una categoría
                        </option>
                        <option value="male">Masculino</option>
                        <option value="female">Femenino</option>
                    </select>
                </div>
            </div>

            <div class="d-flex align-items-center gap-2">
                <a class="btn-outline theme-secondary" href="/teams">
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
