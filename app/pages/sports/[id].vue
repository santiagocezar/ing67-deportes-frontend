<script setup lang="ts">
import type { SportEnvelope, SportUpdateRequest } from "~/utils/openapi";

const route = useRoute();
const { $api } = useNuxtApp();

const {
    data: response,
    pending,
    refresh,
} = await useAPI<SportEnvelope>(() => `/sports/${route.params.id}`);

const sport = computed(() => response.value?.sport ?? null);

const edited = reactive<SportUpdateRequest>({
    name: "",
});

const message = ref("");

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

watch(
    sport,
    (value) => {
        if (!value) return;
        edited.name = value.name;
    },
    { immediate: true },
);

async function saveSport(ev: SubmitEvent) {
    ev.preventDefault();
    if (!sport.value) return;
    message.value = "";

    try {
        await $api(`/sports/${sport.value.id}`, {
            method: "PUT",
            body: {
                name: edited.name,
            },
        });
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

        <template v-if="sport">
            <h1 class="h4 mb-1">Editar deporte #{{ sport.id }}</h1>
            <p class="fg-2 mb-3">
                Máx. {{ sport.max_players }} jugadores ·
                {{ sport.max_players_in_game }} en cancha
            </p>

            <form class="vstack gap-3" action="#" @submit="saveSport">
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
                    <a
                        class="btn-outline theme-secondary ms-auto"
                        href="/sports"
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
