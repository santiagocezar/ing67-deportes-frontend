<script setup lang="ts">
import type {
    PlayerSanctionCreateRequest,
    PlayerSanctionResponse,
} from "~/utils/openapi";

import { IconArrowLeft, IconSubtract } from "~/assets/icons";
import SanctionCard from "~/components/SanctionCard.vue";
import SanctionForm from "~/components/SanctionForm.vue";
import { t } from "vue-router/dist/options-B1Pk0SIa.mjs";

const route = useRoute();
const { $api, $bootstrap } = useNuxtApp();

const {
    data: sanction,
    pending,
    error,
    refresh,
} = await useAPI<PlayerSanctionResponse>(
    () => `/sanctions/${route.params.sanctionId}`,
);

const { me, isAdministrator, canEdit, canAnnull, isDurationLocked } =
    await useSanctionPermissions();

const { forget: forgetActiveSanction } = useActiveSanctions();

const saving = ref(false);
const message = ref("");
const successMessage = ref("");
const dialogMessage = ref("");
const confirmDialog = ref<HTMLDialogElement | null>(null);

const editBlockedReason = computed(() => {
    const current = sanction.value;
    if (!current) return "";

    if (current.status === "served") {
        return "La sanción está cumplida y no puede modificarse.";
    }
    if (current.status === "annulled") {
        return "La sanción está anulada y no puede modificarse.";
    }
    if (canEdit(current)) return "";

    if (
        me.value?.user.role === "referee" &&
        me.value.user.id === current.creator.id
    ) {
        return "Solo podés editar la sanción mientras el partido de origen siga en curso.";
    }

    return "Solo el árbitro que creó la sanción o un administrador pueden editarla.";
});

const annulBlockedReason = computed(() => {
    const current = sanction.value;
    if (!current) return "";

    if (current.status === "served") {
        return "Una sanción cumplida no puede anularse.";
    }
    if (current.status === "annulled") {
        return "Esta sanción ya está anulada.";
    }
    if (!isAdministrator.value) {
        return "Solo un administrador puede anular una sanción activa.";
    }

    return "";
});

function errorMessage(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    return body?.error?.message ?? "Ocurrió un error inesperado.";
}

async function closeConfirmation() {
    if (!confirmDialog.value) return;
    await $bootstrap.Dialog.getOrCreateInstance(confirmDialog.value).hide();
}

function openConfirmation() {
    message.value = "";
    successMessage.value = "";
    dialogMessage.value = "";

    if (!confirmDialog.value) return;
    void $bootstrap.Dialog.getOrCreateInstance(confirmDialog.value).show();
}

async function saveSanction(body: PlayerSanctionCreateRequest) {
    if (!sanction.value) return;

    saving.value = true;
    message.value = "";
    successMessage.value = "";

    try {
        await $api(`/sanctions/${sanction.value.id}`, {
            method: "PUT",
            body,
        });
    } catch (error) {
        message.value = errorMessage(error);
        saving.value = false;
        return;
    }

    successMessage.value = "Sanción actualizada.";
    forgetActiveSanction(sanction.value.player.id);
    saving.value = false;
    await refresh();
}

async function annulSanction() {
    if (!sanction.value) return;

    saving.value = true;
    message.value = "";
    successMessage.value = "";
    dialogMessage.value = "";

    try {
        await $api(`/sanctions/${sanction.value.id}/annul`, {
            method: "PATCH",
        });
    } catch (error) {
        dialogMessage.value = errorMessage(error);
        saving.value = false;
        return;
    }

    successMessage.value = "Sanción anulada.";
    forgetActiveSanction(sanction.value.player.id);
    saving.value = false;
    await closeConfirmation();
    await refresh();
}
</script>

<template>
    <div>
        <NuxtLink
            v-if="sanction"
            class="d-flex align-items-center gap-1 text-decoration-none mb-3"
            :to="{
                name: 'home-sport-players-id',
                params: {
                    sport: route.params.sport,
                    id: sanction.player.id,
                },
            }"
        >
            <IconArrowLeft />
            <span>Volver a {{ sanction.player.name }}</span>
        </NuxtLink>

        <p v-if="pending">Cargando sanción...</p>

        <div v-else-if="error" class="alert theme-danger" role="alert">
            No se pudo cargar la sanción.
        </div>

        <template v-else-if="sanction">
            <div class="d-flex flex-wrap align-items-start gap-2 mb-2">
                <div class="flex-grow-1">
                    <h1 class="h2 fw-light mb-1">{{ sanction.title }}</h1>
                    <p class="fg-2 mb-0"></p>
                </div>
                <span
                    class="badge badge-subtle"
                    :class="sanctionStatusTheme(sanction.status)"
                >
                    {{ sanctionStatusLabel(sanction.status) }}
                </span>
            </div>
            <hr />

            <div
                v-if="successMessage"
                class="alert theme-success"
                role="status"
            >
                {{ successMessage }}
            </div>
            <div v-if="message" class="alert theme-danger" role="alert">
                {{ message }}
            </div>

            <div class="card">
                <div class="card-body">
                    <dl class="grid gap-0 small">
                        <dt>Creada el</dt>
                        <dd>{{ formatDateTime(sanction.created_at) }}</dd>
                        <dt>Creada por</dt>
                        <dd>{{ sanction.creator.name }}</dd>

                        <hr />
                        <template
                            v-if="sanction.updated_at !== sanction.created_at"
                        >
                            <dt>Modificada el</dt>
                            <dd>{{ formatDateTime(sanction.created_at) }}</dd>
                            <dt>Modificada por</dt>
                            <dd>{{ sanction.creator.name }}</dd>
                            <hr />
                        </template>

                        <dt>Vigente desde</dt>
                        <dd>{{ formatDateTime(sanction.effective_at) }}</dd>
                        <hr />

                        <dt>Fechas sancionadas</dt>
                        <dd>{{ sanction.suspension_matches }}</dd>

                        <dt>Fechas cumplidas</dt>
                        <dd>
                            {{
                                sanction.suspension_matches -
                                sanction.remaining_matches
                            }}
                        </dd>
                        <hr />

                        <dt>Jugador</dt>
                        <dd>
                            <NuxtLink
                                :to="{
                                    name: 'home-sport-players-id',
                                    params: {
                                        sport: route.params.sport,
                                        id: sanction.player.id,
                                    },
                                }"
                            >
                                {{ sanction.player.name }}
                            </NuxtLink>
                        </dd>

                        <template
                            v-if="sanction.frozen_teams.length"
                            class="fg-2 small mb-0"
                        >
                            <dt>Jugaba en</dt>
                            <dd>
                                <template
                                    v-for="(team, i) in sanction.frozen_teams"
                                >
                                    <span v-if="i !== 0">, </span>

                                    <NuxtLink
                                        :to="{
                                            name: 'home-sport-teams-id',
                                            params: {
                                                sport: route.params.sport,
                                                id: sanction.player.id,
                                            },
                                        }"
                                    >
                                        {{ team.name }}
                                    </NuxtLink>
                                </template>
                            </dd>
                        </template>

                        <dt>Partido</dt>
                        <dd>
                            <NuxtLink
                                :to="{
                                    name: 'home-sport-competitions-id-matches-matchId',
                                    params: {
                                        sport: route.params.sport,
                                        id: sanction.source_competition.id,
                                        matchId: sanction.source_match.id,
                                    },
                                }"
                            >
                                {{
                                    formatDateTime(
                                        sanction.source_match.starts_at,
                                    )
                                }}
                                - {{ sanction.source_competition.name }}
                            </NuxtLink>
                        </dd>
                        <template v-if="sanction.served_at">
                            <hr />
                            <dt>Cumplida el</dt>
                            <dd>{{ formatDateTime(sanction.served_at) }}</dd>
                        </template>

                        <template
                            v-if="
                                sanction.annulled_at &&
                                sanction.status === 'annulled' &&
                                sanction.annuller
                            "
                        >
                            <hr />
                            <dt>Anulada el</dt>
                            <dd>{{ formatDateTime(sanction.annulled_at) }}</dd>

                            <dt>Anulada por</dt>
                            <dd>{{ sanction.annuller.name }}</dd>
                        </template>
                    </dl>
                </div>
            </div>

            <section v-if="canEdit(sanction)" class="mt-4">
                <SanctionForm
                    :key="sanction.id"
                    :initial="sanction"
                    :player-name="sanction.player.name"
                    :saving
                    :blocked="editBlockedReason"
                    :duration-locked="isDurationLocked(sanction)"
                    submit-label="Guardar cambios"
                    @submit="saveSanction"
                />
            </section>

            <section v-if="canAnnull(sanction)" class="mt-4">
                <h2 class="h5 mb-2">Anular sanción</h2>
                <p class="fg-2">
                    La sanción quedará en el historial como Anulada y no se
                    eliminará.
                </p>
                <button
                    class="btn-outline theme-danger"
                    type="button"
                    @click="openConfirmation"
                >
                    <IconSubtract />
                    <span>Anular sanción</span>
                </button>
            </section>
            <div
                v-else-if="annulBlockedReason"
                class="alert theme-secondary mt-3"
                role="status"
            >
                {{ annulBlockedReason }}
            </div>
        </template>

        <p v-else>No se encontró la sanción.</p>

        <dialog ref="confirmDialog" class="dialog">
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
                <p class="mb-0">
                    ¿Anular la sanción
                    <strong>{{ sanction?.title }}</strong>
                    de {{ sanction?.player.name }}? Quedará en el historial como
                    Anulada y no se eliminará.
                </p>
                <div
                    v-if="dialogMessage"
                    class="alert theme-danger"
                    role="alert"
                >
                    {{ dialogMessage }}
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
                        :disabled="saving"
                        @click="annulSanction"
                    >
                        <span
                            v-if="saving"
                            class="spinner-border spinner-border-sm"
                            aria-hidden="true"
                        ></span>
                        <span>{{
                            saving ? "Anulando…" : "Anular sanción"
                        }}</span>
                    </button>
                </div>
            </div>
        </dialog>
    </div>
</template>

<style lang="css" scoped>
dl {
    display: grid;
    grid-template-columns: 1fr;
    hr {
        margin: 0;
        margin-bottom: 0.5em;
        grid-column: 1 / -1;
    }
    @media (width >= 768px) {
        grid-template-columns: 1fr auto;

        & dd {
            text-align: right;
        }
    }

    & dt {
    }
}
</style>
