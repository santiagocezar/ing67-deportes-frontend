<script setup lang="ts">
import type {
    SportCreateRequest,
    SportEnvelope,
    SportListResponse,
    SportResponse,
    SportUpdateRequest,
} from "~/utils/openapi";

import {
    IconAdd,
    IconCheckmark,
    IconChevronRight,
    IconEdit,
} from "~/assets/icons";
import Header from "~/components/Header.vue";

const { $api, $bootstrap } = useNuxtApp();

const { isAdministrator } = useCurrentUser();

const { data, pending, error, refresh } =
    await useAPI<SportListResponse>("/sports");

const sports = computed(() => data.value?.sports ?? []);

const creation = reactive<{
    name: string;
    max_players: number | "";
    max_players_in_game: number | "";
}>({
    name: "",
    max_players: "",
    max_players_in_game: "",
});

const creating = ref(false);
const createMessage = ref("");
const createSuccess = ref("");

// El nombre es el único campo editable de un deporte: se edita en un menú
// desplegable, de a un deporte por vez.
const renameDraft = ref("");
const renameMessage = ref("");
const renaming = ref<number | null>(null);

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    return body?.error?.message ?? "Ocurrió un error inesperado.";
}

function resetCreation() {
    creation.name = "";
    creation.max_players = "";
    creation.max_players_in_game = "";
}

function hideCreationForm() {
    const form = document.getElementById("new-sport");
    if (!form) return;
    $bootstrap.Collapse.getOrCreateInstance(form).hide();
}

async function createSport(ev: SubmitEvent) {
    ev.preventDefault();
    createMessage.value = "";
    createSuccess.value = "";

    creating.value = true;
    let sport: SportEnvelope["sport"];

    try {
        const response = await $api<SportEnvelope>("/sports", {
            method: "POST",
            body: {
                name: creation.name,
                max_players: Number(creation.max_players),
                max_players_in_game: Number(creation.max_players_in_game),
            } satisfies SportCreateRequest,
        });
        sport = response.sport;
    } catch (error) {
        createMessage.value = reportError(error);
        creating.value = false;
        return;
    }

    creating.value = false;
    resetCreation();
    hideCreationForm();
    createSuccess.value = `Se agregó «${sport.name}».`;

    await refresh();
}

function openRename(sport: SportResponse) {
    renameDraft.value = sport.name;
    renameMessage.value = "";
}

function hideRename(sport: SportResponse) {
    const toggle = document.getElementById(`rename-sport-${sport.id}`);
    if (!toggle) return;
    $bootstrap.Menu.getOrCreateInstance(toggle).hide();
}

async function renameSport(ev: SubmitEvent, sport: SportResponse) {
    ev.preventDefault();
    renameMessage.value = "";

    const name = renameDraft.value.trim();

    renaming.value = sport.id;

    try {
        await $api<SportEnvelope>(`/sports/${sport.id}`, {
            method: "PUT",
            body: { name } satisfies SportUpdateRequest,
        });
        hideRename(sport);

        await refresh();
    } catch (error) {
        renameMessage.value = reportError(error);
    } finally {
        renaming.value = null;
    }
}
</script>

<template>
    <Header title="Deportes" />

    <div class="container p-4">
        <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
            <h1 class="h2 fw-light m-0">Deportes</h1>
            <button
                v-if="isAdministrator"
                class="btn-solid rounded-pill ms-auto"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#new-sport"
                aria-expanded="false"
                aria-controls="new-sport"
            >
                <IconAdd />
                Nuevo
            </button>
        </div>

        <div class="collapse" id="new-sport">
            <form
                class="card card-body mb-3 vstack gap-3"
                action="#"
                @submit="createSport"
            >
                <h2 class="h5 mb-0">Agregar deporte</h2>

                <div
                    class="alert theme-danger mb-0"
                    role="alert"
                    v-if="createMessage"
                >
                    {{ createMessage }}
                </div>

                <div class="form-field">
                    <label class="form-label" for="new-sport-name">
                        Nombre
                    </label>
                    <input
                        class="form-control"
                        id="new-sport-name"
                        v-model="creation.name"
                        type="text"
                        required
                    />
                </div>

                <div class="row g-3">
                    <div class="md:col-6 form-field">
                        <label class="form-label" for="new-sport-max-players">
                            Máx. de jugadores
                        </label>
                        <input
                            class="form-control"
                            id="new-sport-max-players"
                            v-model.number="creation.max_players"
                            type="number"
                            min="1"
                            required
                        />
                    </div>
                    <div class="md:col-6 form-field">
                        <label
                            class="form-label"
                            for="new-sport-max-players-in-game"
                        >
                            Jugadores en cancha
                        </label>
                        <input
                            class="form-control"
                            id="new-sport-max-players-in-game"
                            v-model.number="creation.max_players_in_game"
                            type="number"
                            min="1"
                            required
                        />
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2">
                    <button
                        class="btn-outline theme-secondary"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#new-sport"
                        aria-expanded="false"
                        aria-controls="new-sport"
                    >
                        Cancelar
                    </button>
                    <button
                        class="btn-solid theme-primary ms-auto"
                        :disabled="creating"
                    >
                        {{ creating ? "Agregando…" : "Confirmar" }}
                    </button>
                </div>
            </form>
        </div>

        <div class="alert theme-success" role="status" v-if="createSuccess">
            {{ createSuccess }}
        </div>

        <div class="d-flex align-items-center gap-2 fg-2" v-if="pending">
            <span
                class="spinner-border spinner-border-sm"
                aria-hidden="true"
            ></span>
            Cargando deportes…
        </div>
        <div class="alert theme-danger" role="alert" v-else-if="error">
            Hubo un problema para cargar los datos
        </div>
        <div
            class="card card-body text-center fg-2"
            v-else-if="sports.length === 0"
        >
            Todavía no hay deportes. Usá «Nuevo» para agregar el primero.
        </div>
        <template v-else>
            <div
                class="card mb-4 d-flex flex-row flex-wrap gap-4 p-2 align-items-center"
                v-for="sport in sports"
                :key="sport.id"
            >
                <strong class="ps-4 flex-grow-1 text-lg">
                    {{ sport.name }}
                </strong>
                <div class="fg-2 text-sm">
                    <div>
                        Plantel · <strong>{{ sport.max_players }}</strong>
                    </div>
                    <div>
                        Cancha ·
                        <strong>{{ sport.max_players_in_game }}</strong>
                    </div>
                </div>

                <div class="position-relative d-flex">
                    <button
                        class="btn-solid btn-icon"
                        type="button"
                        data-bs-toggle="menu"
                        data-bs-auto-close="outside"
                        data-bs-placement="bottom-end"
                        aria-expanded="false"
                        :aria-label="`Renombrar ${sport.name}`"
                        @click="openRename(sport)"
                    >
                        <IconEdit />
                    </button>
                    <div
                        class="menu card p-0"
                        style="--bs-menu-min-width: 18rem"
                    >
                        <div
                            class="card-header"
                            :id="`cambiar-nombre-${sport.id}`"
                        >
                            <span>Cambiar nombre</span>
                        </div>
                        <form
                            class="card-body p-4"
                            action="#"
                            @submit="renameSport($event, sport)"
                        >
                            <div class="hstack gap-2">
                                <input
                                    :aria-labelledby="`cambiar-nombre-${sport.id}`"
                                    class="form-control"
                                    :id="`sport-name-${sport.id}`"
                                    v-model="renameDraft"
                                    type="text"
                                    required
                                />

                                <div class="d-flex justify-content-end gap-2">
                                    <button
                                        class="btn-solid btn-icon theme-success"
                                        :disabled="renaming === sport.id"
                                    >
                                        <div
                                            v-if="renaming === sport.id"
                                            class="spinner-border fg-primary"
                                            role="status"
                                        >
                                            <span class="visually-hidden"
                                                >Guardando...</span
                                            >
                                        </div>
                                        <IconCheckmark
                                            v-else
                                            aria-label="Guardar"
                                        />
                                    </button>
                                </div>
                            </div>
                            <p
                                class="fg-danger"
                                role="alert"
                                v-if="renameMessage"
                            >
                                {{ renameMessage }}
                            </p>
                        </form>
                    </div>
                </div>

                <NuxtLink
                    class="btn-solid btn-icon"
                    :to="`/home/${sport.id}`"
                    :aria-label="`Abrir ${sport.name}`"
                >
                    <IconChevronRight />
                </NuxtLink>
            </div>
        </template>
    </div>
</template>
