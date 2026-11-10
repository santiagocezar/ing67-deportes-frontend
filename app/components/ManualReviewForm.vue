<script setup lang="ts">
import type {
    AuthMeResponse,
    MatchResponse,
    MatchRosterScanFaceResponse,
    MatchRosterScanManualReviewDecisionRequest,
    MatchRosterScanResponse,
} from "~/utils/openapi";

import { IconSave } from "~/assets/icons";

type Outcome = MatchRosterScanManualReviewDecisionRequest["outcome"];

interface DecisionRow {
    face: MatchRosterScanFaceResponse;
    outcome: Outcome | "";
    playerId: number | "";
}

const props = defineProps<{
    scan: MatchRosterScanResponse;
    match: MatchResponse;
    crops?: Record<number, string>;
}>();

const emit = defineEmits<{
    resolved: [];
}>();

const { $api, $bootstrap } = useNuxtApp();

const { data: me } = await useAPI<AuthMeResponse>("/auth/me", {
    onResponseError: () => {}, // evitar redirigir
});

const unknownFaces = computed(() =>
    props.scan.faces.filter((face) => face.status === "unknown"),
);

const roster = computed(() => {
    const team = [props.match.team_1, props.match.team_2].find(
        (team) => team.id === props.scan.team_id,
    );

    return team?.roster ?? [];
});

const review = computed(() => props.scan.manual_review);

const isAssignedReferee = computed(
    () =>
        me.value?.user.role === "referee" &&
        me.value.user.id === props.match.referee.id,
);

const matchOpen = computed(
    () =>
        props.match.status === "in_progress" ||
        props.match.status === "finished",
);

const canResolve = computed(
    () =>
        review.value?.status === "pending" &&
        isAssignedReferee.value &&
        matchOpen.value,
);

// El formulario se completa en el cliente; una vez enviado, la revisión es
// inmutable y la imagen grupal se elimina.
const rows = reactive<DecisionRow[]>(
    unknownFaces.value.map((face) => ({
        face,
        outcome: "",
        playerId: "",
    })),
);

const selectedPlayerIds = computed(() => {
    const ids = new Set<number>();

    for (const row of rows) {
        if (row.outcome === "belongs_to_team" && row.playerId !== "") {
            ids.add(row.playerId);
        }
    }

    return ids;
});

const complete = computed(
    () =>
        rows.length > 0 &&
        rows.every(
            (row) =>
                row.outcome !== "" &&
                (row.outcome !== "belongs_to_team" || row.playerId !== ""),
        ),
);

const saving = ref(false);
const message = ref("");
const confirmDialog = ref<HTMLDialogElement | null>(null);

function playerOptions(row: DecisionRow) {
    return roster.value.filter(
        (player) =>
            player.id === row.playerId ||
            !selectedPlayerIds.value.has(player.id),
    );
}

function onOutcomeChange(row: DecisionRow) {
    if (row.outcome !== "belongs_to_team") row.playerId = "";
}

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
        await $api(`/roster-scans/${props.scan.id}/manual-review`, {
            method: "PUT",
            body: { decisions },
        });

        await closeConfirmation();
        emit("resolved");
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
    {{ "" + canResolve }}
    <section v-if="canResolve" class="card mt-4">
        <div class="card-header">
            <h2 class="h5 mb-0">Resolver revisión</h2>
        </div>
        <div class="card-body vstack gap-3">
            <p class="fg-2 small mb-0">
                Indicá qué hacer con cada cara que el escaneo no pudo
                identificar. La revisión se guarda una sola vez.
            </p>

            <fieldset
                v-for="row in rows"
                :key="row.face.face_index"
                class="decision"
            >
                <legend class="d-flex align-items-center gap-2">
                    <img
                        v-if="crops?.[row.face.face_index]"
                        class="avatar avatar-sm"
                        style="border: none"
                        :src="crops?.[row.face.face_index]"
                        alt=""
                    />
                    <span v-else class="avatar avatar-sm">
                        {{ avatarLetters(row.face.player_name ?? "?") }}
                    </span>
                    <span>Cara {{ row.face.face_index + 1 }}</span>
                </legend>

                <div
                    class="btn-group"
                    role="group"
                    :aria-label="`Decisión para la cara ${row.face.face_index + 1}`"
                >
                    <label class="btn-check btn-outline theme-primary">
                        <input
                            type="radio"
                            autocomplete="off"
                            :name="`face-${row.face.face_index}-outcome`"
                            value="belongs_to_team"
                            v-model="row.outcome"
                            @change="onOutcomeChange(row)"
                        />
                        Pertenece al equipo
                    </label>
                    <label class="btn-check btn-outline theme-primary">
                        <input
                            type="radio"
                            autocomplete="off"
                            :name="`face-${row.face.face_index}-outcome`"
                            value="does_not_belong_to_team"
                            v-model="row.outcome"
                            @change="onOutcomeChange(row)"
                        />
                        No pertenece
                    </label>
                    <label class="btn-check btn-outline theme-primary">
                        <input
                            type="radio"
                            autocomplete="off"
                            :name="`face-${row.face.face_index}-outcome`"
                            value="inconclusive"
                            v-model="row.outcome"
                            @change="onOutcomeChange(row)"
                        />
                        Inconcluso
                    </label>
                </div>

                <div
                    v-if="row.outcome === 'belongs_to_team'"
                    class="form-field mt-2"
                >
                    <label
                        class="form-label"
                        :for="`face-${row.face.face_index}-player`"
                    >
                        Jugador
                    </label>
                    <select
                        class="form-control"
                        :id="`face-${row.face.face_index}-player`"
                        v-model="row.playerId"
                    >
                        <option value="">Seleccioná un jugador</option>
                        <option
                            v-for="player in playerOptions(row)"
                            :key="player.id"
                            :value="player.id"
                        >
                            {{ player.name }}
                        </option>
                    </select>
                </div>
            </fieldset>

            <div class="alert theme-danger mb-0" role="alert" v-if="message">
                {{ message }}
            </div>

            <div class="d-flex flex-wrap align-items-center gap-2">
                <p class="fg-2 small mb-0">
                    La revisión es definitiva y elimina la imagen grupal.
                </p>
                <button
                    class="btn-solid theme-primary ms-auto"
                    type="button"
                    :disabled="saving"
                    @click="openConfirmation"
                >
                    <IconSave />
                    <span>Resolver revisión</span>
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
                    Se guardarán las decisiones de
                    {{ rows.length }}
                    {{ rows.length === 1 ? "cara" : "caras" }} sin identificar y
                    se eliminará la imagen grupal.
                </p>
                <p class="fg-2 small mb-0">Esta acción no se puede deshacer.</p>
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
                        <span>{{ saving ? "Guardando…" : "Confirmar" }}</span>
                    </button>
                </div>
            </div>
        </dialog>
    </section>

    <div
        v-else-if="
            review?.status === 'pending' && isAssignedReferee && !matchOpen
        "
        class="alert theme-info mt-4"
        role="alert"
    >
        La revisión se podrá resolver cuando el partido esté en curso o
        finalizado.
    </div>
</template>

<style scoped>
.decision {
    padding: 0.75rem 1rem;
    border: 1px solid var(--bs-border-color, #dee2e6);
    border-radius: 0.5rem;
}

.decision legend {
    float: none;
    width: auto;
    padding: 0 0.25rem;
    margin-bottom: 0.5rem;
    font-size: 1rem;
}
</style>
