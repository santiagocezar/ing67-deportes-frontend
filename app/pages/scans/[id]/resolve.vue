<script setup lang="ts">
import {
    IconCheckmark,
    IconDismiss,
    IconQuestion,
    IconArrowLeft,
} from "~/assets/icons";
import Header from "~/components/Header.vue";
import type {
    MatchResponse,
    MatchRosterScanFaceResponse,
    MatchRosterScanManualReviewDecisionRequest,
    MatchRosterScanResponse,
} from "~/utils/openapi";

const route = useRoute();

const { data, pending, error, scan, match, competition, team, refresh } =
    await useScanDetail();
const { crops, revokeGroupImage } = useScanGroupImage(scan);
const { review, canResolve, blockedReason } = await useManualReviewAccess(
    scan,
    match,
);

const unknownFaces = computed(() =>
    scan.value?.faces.filter((face) => face.status === "unknown"),
);

const resolvedMessage = ref("");

async function onResolved() {
    revokeGroupImage();
    location.href = "/scans/" + route.params.id;
}

type Outcome = MatchRosterScanManualReviewDecisionRequest["outcome"];

interface DecisionRow {
    face: MatchRosterScanFaceResponse;
    outcome: Outcome | "";
    playerId: number | "";
}

const { $api, $bootstrap } = useNuxtApp();
const {
    public: { apiBase },
} = useRuntimeConfig();

const roster = computed(() => {
    const team = [match.value?.team_1, match.value?.team_2].find(
        (team) => team?.id === scan.value?.team_id,
    );

    return team?.roster ?? [];
});

// El formulario se completa en el cliente; una vez enviado, la revisión es
// inmutable y la imagen grupal se elimina.
const rows = reactive<DecisionRow[]>(
    unknownFaces.value?.map((face) => ({
        face,
        outcome: "",
        playerId: "",
    })) ?? [],
);

const complete = computed(
    () =>
        rows.length > 0 &&
        rows.every(
            (row) =>
                row.outcome !== "" &&
                (row.outcome !== "belongs_to_team" || row.playerId !== ""),
        ),
);

function isPlayerTaken(row: DecisionRow, playerId: number) {
    return rows.some(
        (other) =>
            other !== row &&
            other.outcome === "belongs_to_team" &&
            other.playerId === playerId,
    );
}

function selectPlayer(row: DecisionRow, playerId: number) {
    if (isPlayerTaken(row, playerId)) return;

    row.outcome = "belongs_to_team";
    row.playerId = playerId;
}

function selectOutcome(
    row: DecisionRow,
    outcome: Exclude<Outcome, "belongs_to_team">,
) {
    row.outcome = outcome;
    row.playerId = "";
}

const saving = ref(false);
const message = ref("");
const confirmDialog = ref<HTMLDialogElement | null>(null);

async function closeConfirmation() {
    if (!confirmDialog.value) return;
    await $bootstrap.Dialog.getOrCreateInstance(confirmDialog.value).hide();
}

function openConfirmation() {
    message.value = "";

    if (!complete.value) {
        message.value = "Completá una decisión para cada cara sin identificar.";
        return;
    }

    if (!confirmDialog.value) return;
    void $bootstrap.Dialog.getOrCreateInstance(confirmDialog.value).show();
}

async function submit() {
    if (!complete.value || saving.value) return;

    saving.value = true;
    message.value = "";

    const decisions: MatchRosterScanManualReviewDecisionRequest[] = rows.map(
        (row) => ({
            face_index: row.face.face_index,
            outcome: row.outcome as Outcome,
            ...(row.outcome === "belongs_to_team"
                ? { player_id: Number(row.playerId) }
                : {}),
        }),
    );

    try {
        await $api(`/roster-scans/${scan.value?.id}/manual-review`, {
            method: "PUT",
            body: { decisions },
        });

        await closeConfirmation();
        onResolved();
    } catch (error) {
        const body = (error as { data?: { error?: { message?: string } } })
            .data;
        message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
        await closeConfirmation();
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div>
        <Header title="Resolver revisión" />

        <div class="container p-4">
            <NuxtLink
                class="d-flex align-items-center gap-1 text-decoration-none mb-3"
                :to="{ name: 'scans-id', params: { id: route.params.id } }"
            >
                <IconArrowLeft />
                <span>
                    Volver a la revisión de {{ team?.name ?? "equipo" }}
                </span>
            </NuxtLink>

            <div
                v-if="resolvedMessage"
                class="alert vstack theme-success"
                role="status"
            >
                <p class="mb-1">{{ resolvedMessage }}</p>
                <NuxtLink
                    :to="{ name: 'scans-id', params: { id: route.params.id } }"
                >
                    Ver el resultado
                </NuxtLink>
            </div>

            <div class="d-flex align-items-center gap-2 fg-2" v-if="pending">
                <span
                    class="spinner-border spinner-border-sm"
                    aria-hidden="true"
                ></span>
                Cargando revisión…
            </div>

            <div class="alert theme-danger" role="alert" v-else-if="error">
                No se pudo cargar la revisión.
            </div>

            <template v-else-if="data && scan && match && competition">
                <div class="mb-2">
                    <h1 class="h2 fw-light mb-1">Resolver revisión</h1>

                    <p
                        v-if="review?.status === 'pending'"
                        class="fg-2 small mb-0 mt-1"
                    >
                        Vence el {{ formatDateTime(review.expires_at) }}
                    </p>
                </div>
                <hr />

                <template v-if="canResolve && unknownFaces?.length">
                    <div class="card-body vstack gap-3">
                        <p class="fg-2 small mb-0">
                            Indicá qué hacer con cada cara que el escaneo no
                            pudo identificar. La revisión se guarda una sola
                            vez.
                        </p>

                        <div
                            v-for="row in rows"
                            :key="row.face.face_index"
                            class="decision vstack gap-3"
                            role="group"
                            :aria-labelledby="`face-decision-${row.face.face_index}`"
                        >
                            <p
                                :id="`face-decision-${row.face.face_index}`"
                                class="fw-semibold mb-2 text-center"
                            >
                                Cara {{ row.face.face_index + 1 }}
                            </p>
                            <img
                                v-if="crops?.[row.face.face_index]"
                                class="face-crop mx-auto"
                                :src="crops?.[row.face.face_index]"
                                :alt="`Cara ${row.face.face_index + 1} sin identificar`"
                            />
                            <span v-else class="avatar face-crop mx-auto">
                                {{ avatarLetters(row.face.player_name ?? "?") }}
                            </span>

                            <div class="decision-body">
                                <div class="form-label vstack text-center">
                                    <div>¿Quién es?</div>

                                    <div class="small fg-2">
                                        Seleccione una opción
                                    </div>
                                </div>

                                <div
                                    class="player-strip"
                                    role="group"
                                    :aria-label="`Jugadores del equipo para la cara ${row.face.face_index + 1}`"
                                >
                                    <button
                                        v-for="player in roster"
                                        :key="player.id"
                                        class="player-option"
                                        :class="{
                                            selected:
                                                row.outcome ===
                                                    'belongs_to_team' &&
                                                row.playerId === player.id,
                                        }"
                                        type="button"
                                        :disabled="
                                            isPlayerTaken(row, player.id)
                                        "
                                        :aria-pressed="
                                            row.outcome === 'belongs_to_team' &&
                                            row.playerId === player.id
                                        "
                                        @click="selectPlayer(row, player.id)"
                                    >
                                        <img
                                            v-if="player.primary_photo_path"
                                            class="avatar avatar-xl object-fit-cover"
                                            style="border: none"
                                            :src="
                                                apiBase +
                                                player.primary_photo_path
                                            "
                                            alt=""
                                        />
                                        <span v-else class="avatar avatar-xl">
                                            {{ avatarLetters(player.name) }}
                                        </span>
                                        <span class="player-option__name">
                                            {{ player.name }}
                                        </span>
                                    </button>
                                </div>

                                <div class="grid grid-cols-2 gap-2 mt-2">
                                    <button
                                        type="button"
                                        :class="
                                            row.outcome ===
                                            'does_not_belong_to_team'
                                                ? 'btn-solid theme-danger w-100'
                                                : 'btn-outline theme-danger w-100'
                                        "
                                        :aria-pressed="
                                            row.outcome ===
                                            'does_not_belong_to_team'
                                        "
                                        @click="
                                            selectOutcome(
                                                row,
                                                'does_not_belong_to_team',
                                            )
                                        "
                                    >
                                        <IconDismiss />
                                        <span>Ninguno</span>
                                    </button>
                                    <button
                                        type="button"
                                        :class="
                                            row.outcome === 'inconclusive'
                                                ? 'btn-solid theme-secondary w-100'
                                                : 'btn-outline theme-secondary w-100'
                                        "
                                        :aria-pressed="
                                            row.outcome === 'inconclusive'
                                        "
                                        @click="
                                            selectOutcome(row, 'inconclusive')
                                        "
                                    >
                                        <IconQuestion />
                                        <span>No sé</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <p v-if="!rows.length" class="fg-2 mb-0">
                            El escaneo no tiene caras sin identificar.
                        </p>

                        <div
                            class="alert theme-danger mb-0"
                            role="alert"
                            v-if="message"
                        >
                            {{ message }}
                        </div>

                        <div class="d-flex flex-wrap align-items-center gap-2">
                            <p class="fg-2 small mb-0">
                                La revisión es definitiva y elimina la imagen
                                grupal.
                            </p>
                            <button
                                class="btn-solid theme-success ms-auto"
                                type="button"
                                :disabled="saving"
                                @click="openConfirmation"
                            >
                                <IconCheckmark />
                                <span> Listo </span>
                            </button>
                        </div>
                    </div>

                    <dialog ref="confirmDialog" class="dialog">
                        <div class="dialog-header">
                            <h2 class="dialog-title">Confirmar revisión</h2>
                            <button
                                type="button"
                                class="btn-close"
                                data-bs-dismiss="dialog"
                                aria-label="Cerrar"
                            ></button>
                        </div>
                        <div class="dialog-body vstack gap-3">
                            <p class="mb-0">
                                Se guardarán las decisiones y
                                <strong>se eliminará la imagen grupal</strong>.
                            </p>
                            <p class="fg-danger mb-0">
                                Esta acción no se puede repetir ni deshacer.
                            </p>
                            <div class="d-flex justify-content-end gap-2">
                                <button
                                    class="btn-outline theme-secondary"
                                    type="button"
                                    data-bs-dismiss="dialog"
                                >
                                    Cancelar
                                </button>
                                <button
                                    class="btn-solid theme-primary"
                                    type="button"
                                    :disabled="saving"
                                    @click="submit"
                                >
                                    <span
                                        v-if="saving"
                                        class="spinner-border spinner-border-sm"
                                        aria-hidden="true"
                                    ></span>
                                    <span>{{
                                        saving ? "Guardando…" : "Continuar"
                                    }}</span>
                                </button>
                            </div>
                        </div>
                    </dialog>
                </template>

                <div
                    v-else-if="canResolve"
                    class="alert theme-info"
                    role="alert"
                >
                    El escaneo no tiene caras sin identificar, así que no hay
                    nada para resolver.
                </div>

                <div
                    v-else-if="review?.status === 'pending'"
                    class="alert theme-warning"
                    role="alert"
                >
                    {{ blockedReason }}
                </div>

                <div
                    v-else-if="review"
                    class="alert vstack theme-secondary"
                    role="status"
                >
                    <p class="mb-1">
                        {{
                            review.status === "expired"
                                ? "La revisión venció sin resolverse."
                                : "La revisión ya fue resuelta."
                        }}
                    </p>
                    <NuxtLink
                        :to="{
                            name: 'scans-id',
                            params: { id: route.params.id },
                        }"
                    >
                        Ver el resultado
                    </NuxtLink>
                </div>

                <div v-else class="alert theme-secondary" role="status">
                    Este escaneo no tiene revisión manual.
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped>
.face-crop {
    --bs-avatar-size: 10rem;
    flex: none;
    width: 10rem;
    height: 10rem;
    font-size: 2.5rem;
    border: 1px solid var(--bs-border-color);
    border-radius: 0.75rem;
    object-fit: cover;
}

.decision-body {
    flex: 1 1 14rem;
    min-width: 0;
}

.player-strip {
    display: flex;
    gap: 0.5rem;
    padding: 0.25rem 0.125rem 0.5rem;
    overflow-x: auto;
}

.player-option {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    width: 6.5rem;
    padding: 0.5rem;
    color: inherit;
    font: inherit;
    background-color: transparent;
    border: 1px solid var(--bs-border-color);
    border-radius: 0.5rem;
    cursor: pointer;
}

.player-option:hover:not(:disabled) {
    border-color: var(--bs-primary-border);
}

.player-option.selected {
    background-color: var(--bs-primary-bg-subtle);
    border-color: var(--bs-primary-border);
}

.player-option:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.player-option__name {
    display: -webkit-box;
    overflow: hidden;
    font-size: 0.75rem;
    line-height: 1.1;
    text-align: center;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}

.decision {
    padding: 0.75rem 1rem;
    border: 1px solid var(--bs-border-color, #dee2e6);
    border-radius: 0.5rem;
}
</style>
