<script setup lang="ts">
import type {
    PlayerSanctionCreateRequest,
    PlayerSanctionListResponse,
    PlayerSanctionResponse,
} from "~/utils/openapi";

import SanctionCard from "~/components/SanctionCard.vue";
import SanctionForm from "~/components/SanctionForm.vue";

const props = defineProps<{ playerId: number }>();

const emit = defineEmits<{ changed: [] }>();

const { $api } = useNuxtApp();

const filters = reactive<{
    status: PlayerSanctionResponse["status"] | "";
    page: number;
}>({
    status: "",
    page: 1,
});

const sanctionsQuery = computed(() => {
    const query: Record<string, string | number> = { page: filters.page };
    if (filters.status) query.status = filters.status;
    return query;
});

const { data, pending, error, refresh } =
    await useAPI<PlayerSanctionListResponse>(
        () => `/players/${props.playerId}/sanctions`,
        { query: sanctionsQuery },
    );

const { canEdit, canAnnull, isDurationLocked } = await useSanctionPermissions();

const { forget: forgetActiveSanction } = useActiveSanctions();

const editing = ref<PlayerSanctionResponse | null>(null);
const annulling = ref<PlayerSanctionResponse | null>(null);
const saving = ref(false);
const dialogError = ref("");
const dialogSuccess = ref("");

// Cambiar el filtro vuelve a la primera página del historial.
watch(
    () => filters.status,
    () => {
        filters.page = 1;
    },
);

function goToPage(page: number) {
    filters.page = page;
}

function errorMessage(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    return body?.error?.message ?? "Ocurrió un error inesperado.";
}

function openEdit(sanction: PlayerSanctionResponse) {
    editing.value = sanction;
    dialogError.value = "";
    dialogSuccess.value = "";
}

function openAnnul(sanction: PlayerSanctionResponse) {
    annulling.value = sanction;
    dialogError.value = "";
    dialogSuccess.value = "";
}

function clearDialogs() {
    editing.value = null;
    annulling.value = null;
    dialogError.value = "";
    dialogSuccess.value = "";
}

async function saveEdit(body: PlayerSanctionCreateRequest) {
    if (!editing.value) return;

    saving.value = true;
    dialogError.value = "";
    dialogSuccess.value = "";

    try {
        await $api(`/sanctions/${editing.value.id}`, {
            method: "PUT",
            body,
        });
    } catch (error) {
        dialogError.value = errorMessage(error);
        saving.value = false;
        return;
    }

    saving.value = false;
    dialogSuccess.value = "Sanción actualizada.";
    forgetActiveSanction(props.playerId);
    await refresh();
    emit("changed");
}

async function confirmAnnul() {
    if (!annulling.value) return;

    saving.value = true;
    dialogError.value = "";
    dialogSuccess.value = "";

    try {
        await $api(`/sanctions/${annulling.value.id}/annul`, {
            method: "PATCH",
        });
    } catch (error) {
        dialogError.value = errorMessage(error);
        saving.value = false;
        return;
    }

    saving.value = false;
    dialogSuccess.value = "Sanción anulada.";
    forgetActiveSanction(props.playerId);
    await refresh();
    emit("changed");
}
</script>

<template>
    <section class="mt-4">
        <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
            <h2 class="h5 mb-0 flex-grow-1">Historial disciplinario</h2>
            <div class="form-field">
                <label class="form-label" for="sanctions-status">
                    Estado
                </label>
                <select
                    id="sanctions-status"
                    class="form-control"
                    v-model="filters.status"
                >
                    <option value="">Todas</option>
                    <option value="active">Activas</option>
                    <option value="served">Cumplidas</option>
                    <option value="annulled">Anuladas</option>
                </select>
            </div>
        </div>

        <div class="d-flex align-items-center gap-2 fg-2" v-if="pending">
            <span
                class="spinner-border spinner-border-sm"
                aria-hidden="true"
            ></span>
            Cargando sanciones…
        </div>

        <div class="alert theme-danger" role="alert" v-else-if="error">
            No se pudo cargar el historial disciplinario.
        </div>

        <template v-else-if="data">
            <div
                class="card card-body text-center fg-2"
                v-if="!data.sanctions.length"
            >
                {{
                    filters.status
                        ? "No hay sanciones para el estado seleccionado."
                        : "Este jugador no tiene sanciones registradas."
                }}
            </div>

            <div class="vstack gap-2" v-else>
                <SanctionCard
                    v-for="sanction in data.sanctions"
                    :key="sanction.id"
                    :sanction
                    :can-edit="canEdit(sanction)"
                    :can-annull="canAnnull(sanction)"
                    @edit="openEdit(sanction)"
                    @annul="openAnnul(sanction)"
                />
            </div>

            <nav
                class="d-flex flex-wrap align-items-center gap-2 mt-3"
                v-if="data.pagination.total_pages > 1"
                aria-label="Paginación de sanciones"
            >
                <ul class="pagination mb-0">
                    <li
                        class="page-item"
                        :class="{ disabled: data.pagination.page <= 1 }"
                    >
                        <button
                            class="page-link"
                            type="button"
                            :disabled="data.pagination.page <= 1"
                            @click="goToPage(data.pagination.page - 1)"
                        >
                            Anterior
                        </button>
                    </li>
                    <li
                        class="page-item"
                        :class="{
                            disabled:
                                data.pagination.page >=
                                data.pagination.total_pages,
                        }"
                    >
                        <button
                            class="page-link"
                            type="button"
                            :disabled="
                                data.pagination.page >=
                                data.pagination.total_pages
                            "
                            @click="goToPage(data.pagination.page + 1)"
                        >
                            Siguiente
                        </button>
                    </li>
                </ul>
                <p class="mb-0 fg-2">
                    Página {{ data.pagination.page }} de
                    {{ data.pagination.total_pages }} ({{
                        data.pagination.total_items
                    }}
                    sanciones)
                </p>
            </nav>
        </template>

        <dialog
            id="sanction-edit-dialog"
            class="dialog dialog-scrollable"
            @close="clearDialogs"
        >
            <div class="dialog-header">
                <h2 class="dialog-title">Editar sanción</h2>
                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="dialog"
                    aria-label="Cerrar"
                ></button>
            </div>
            <div class="dialog-body vstack gap-3">
                <div v-if="dialogError" class="alert theme-danger" role="alert">
                    {{ dialogError }}
                </div>
                <div
                    v-if="dialogSuccess"
                    class="alert theme-success"
                    role="status"
                >
                    {{ dialogSuccess }}
                </div>
                <SanctionForm
                    v-if="editing"
                    :key="`edit-${editing.id}`"
                    :initial="editing"
                    :player-name="editing.player.name"
                    :saving
                    :duration-locked="isDurationLocked(editing)"
                    submit-label="Guardar cambios"
                    @submit="saveEdit"
                />
            </div>
        </dialog>

        <dialog id="sanction-annul-dialog" class="dialog" @close="clearDialogs">
            <div class="dialog-header">
                <h2 class="dialog-title">Anular sanción</h2>
                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="dialog"
                    aria-label="Cerrar"
                ></button>
            </div>
            <div class="dialog-body vstack gap-3">
                <p class="mb-0" v-if="annulling">
                    ¿Anular la sanción
                    <strong>{{ annulling.title }}</strong>
                    de {{ annulling.player.name }}? La sanción quedará en el
                    historial como Anulada y no se eliminará.
                </p>
                <div v-if="dialogError" class="alert theme-danger" role="alert">
                    {{ dialogError }}
                </div>
                <div
                    v-if="dialogSuccess"
                    class="alert theme-success"
                    role="status"
                >
                    {{ dialogSuccess }}
                </div>
                <div class="d-flex justify-content-end gap-2">
                    <button
                        type="button"
                        class="btn-outline theme-secondary"
                        data-bs-dismiss="dialog"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        class="btn-solid theme-danger"
                        :disabled="saving || Boolean(dialogSuccess)"
                        @click="confirmAnnul"
                    >
                        {{ saving ? "Anulando…" : "Anular sanción" }}
                    </button>
                </div>
            </div>
        </dialog>
    </section>
</template>

<style scoped>
#sanction-edit-dialog {
    --bs-dialog-width: 36rem;
}

#sanction-annul-dialog {
    --bs-dialog-width: 32rem;
}
</style>
